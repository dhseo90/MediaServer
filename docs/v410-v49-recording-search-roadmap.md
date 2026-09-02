# v4.1.0~v4.9.0 녹화·검색 로드맵

## 문서 상태

- 상태: 2026-09-02 사용자 승인 완료, 2026-09-03 V410-S00 완료. S01~S09 구현·테스트와
  v4.1.0 릴리즈 완료 증거가 아님
- 현재 작성 브랜치: `v4.1.0`
- 공통 반영 시점: v4.1.0을 `main`에 머지할 때 장기 로드맵도 함께 반영
- 이후 소유 브랜치: `main`. 후속 버전 브랜치는 장기 로드맵이 반영된 최신 `main`에서 생성
- 현재 소스 버전: `4.1.0`
- 적용 라이선스: Apache License 2.0 유지
- 세부 설계: [2026-09-02-v410-recording-search-foundation-design.md](superpowers/specs/2026-09-02-v410-recording-search-foundation-design.md)
- 상세 구현계획: [2026-09-02-v410-recording-foundation-implementation-plan.md](superpowers/plans/2026-09-02-v410-recording-foundation-implementation-plan.md)

이 로드맵은 v4.1.0에서 안정적인 녹화 기반을 만들고, 이전 버전의 계약을 뜯어고치지
않은 채 구조화 검색, 벡터 검색, 증거 검토, 상관관계 분석, 자연어 질의와 녹화 재생을
순서대로 추가하는 것을 목표로 한다.

최종 사용 흐름은 다음과 같다.

```text
자연어 질문
  -> 버전이 고정된 QueryPlan
  -> 구조화/벡터/관계 검색
  -> 근거 영상과 분석 메타데이터 결합
  -> JSON 결과
  -> 해당 카메라와 시간의 녹화영상 재생
```

예상 질의:

```text
3시에 자동차 근처에 서성인 사람 찾아줘
```

최종 결과는 해석된 시간 범위, 객체, 행동, 공간 관계와 함께 `camera_id`, 녹화
시작/종료 시각, 관련 track/event/evidence ID, 선정 이유, 점수, 재생 위치를 반환해야
한다. 제품 UI와 공개 API는 같은 application service와 결과 계약을 사용한다.

## 최상위 원칙

1. v4.1.0은 녹화 기능에 집중한다. 검색 기능은 구현하지 않지만 검색 가능한 데이터
   기반은 함께 만든다.
2. 상시녹화는 기본 비활성화하고 채널별 명시 설정으로 켠다.
3. 상시녹화는 고정 길이 세그먼트를 연속 기록한다. 설정 용량을 초과하면 가장 오래된
   상시녹화부터 삭제하고 녹화를 계속한다.
4. 상시녹화와 이벤트 녹화의 용량·보존 정책을 분리한다. 이벤트 클립은 이벤트 보존
   한도에 도달하기 전까지 상시녹화 정리로부터 보호한다.
5. 이벤트 발생 시 겹치는 상시녹화 세그먼트에서 pre/event/post 파생 클립을 만들고,
   상시녹화에 공백이 있으면 기존 이벤트 프레임 버퍼 녹화를 fallback으로 사용한다.
6. 동일 시간에 상시녹화와 이벤트 녹화가 모두 있으면 UI/API의 기본 표출과 재생은
   `event > continuous` 우선순위를 따른다.
7. 영상 파일, 메타데이터 원장, 검색 인덱스를 분리한다. 검색·임베딩·상관관계 인덱스는
   모두 재생성 가능한 파생 데이터다.
8. 공개된 ID와 필드 의미를 다음 버전에서 바꾸지 않는다. 새 요구는 additive schema와
   새 contract version으로 추가한다.
9. 외부 LLM이 없어도 기본 시간·객체·행동·관계 질의가 로컬에서 동작해야 한다. 로컬
   또는 외부 LLM은 선택형 query interpretation adapter다.
10. 이 저장소의 Apache-2.0을 유지한다. 호환되지 않거나 라이선스가 불명확한 코드는
    포함하지 않는다.
11. 의도된 공개용 영문 문서를 제외한 모든 문서는 한글을 기본으로 작성한다. 기술
    식별자와 표준 고유명사는 원문을 유지할 수 있지만 설명과 판정은 한글로 기록한다.

## 브랜치 운용 모델

이 장기 로드맵은 v4.1.0 개발 변경에 포함하고 v4.1.0을 `main`에 머지할 때 공통
source-of-truth로 반영한다. 그 뒤 `v4.2.0`, `v4.3.0` 같은 브랜치는 장기 로드맵이
반영된 최신 `main`에서 만들어 같은 문서를 상속한다. 현재 버전의 구현자는 앞 버전의
불변 계약과 뒤 버전의 소비 목적을 함께 확인할 수 있어야 한다.

각 개별 버전 브랜치는 다음 규칙을 따른다.

1. 브랜치의 개발·테스트 범위는 해당 버전 절과 단계에 한정한다.
2. 후속 버전 절은 현재 데이터·API 계약을 왜 안정적으로 유지해야 하는지 설명하는
   설계 문맥이며, 후속 기능을 미리 구현할 권한이 아니다.
3. 현재 버전에서 후속 버전의 구현을 당겨 넣지 않는다. 대신 후속 버전이 소비할 stable
   ID, time, lifecycle, application interface만 현재 버전의 승인 범위에서 고정한다.
4. 현재 버전 구현 중 장기 로드맵 변경이 필요해지면 임의 수정하지 않고 사용자와
   재조율한다. v4.1.0에서는 승인된 변경을 v4.1.0 머지에 포함하고, 이후 버전에서는 다음
   브랜치를 만들기 전에 `main` 공통 로드맵에 반영한다.
5. 버전 브랜치를 종료할 때 해당 절의 실제 구현·미구현·검증 상태만 갱신한다. 후속
   버전의 계획 상태를 완료로 바꾸지 않는다.
6. 다음 버전 브랜치는 이전 버전의 로드맵·계약 변경이 머지된 최신 `main`에서 생성해
   공통 로드맵과 이전 릴리즈 계약 fixture를 함께 상속한다.

따라서 각 브랜치는 `현재 버전 집중 범위`와 `후속 버전 소비 문맥`을 동시에 가지되,
실제 개발은 현재 버전 집중 범위만 수행한다.

## 참고 자료와 독립 구현 경계

다음 자료는 설계 개념을 검토하는 참고 자료이며, MediaServer는 별도 저장소, submodule,
runtime dependency 또는 동기화 대상이 되지 않는다.

- [MyLocalLLM `VATester-Vector-Search-cpp`](https://github.com/dhseo90/MyLocalLLM/tree/VATester-Vector-Search-cpp):
  임베딩 계약, 벡터 검색 정렬·커서·평가 방식 참고
- [VARuleLens](https://github.com/dhseo90/VARuleLens): 증거 패키지, frame sequence,
  supports/questions/contradictions/unclear 형태의 검토 개념 참고
- [공유 GPT 대화](https://chatgpt.com/share/6a982ed2-2dd4-83ee-b78b-07f9f4b34861):
  Recording -> Search -> Evidence -> Correlation -> Investigation 단계 참고

원본 두 저장소는 그대로 유지하며 수정하지 않는다. 필요한 설계와 로직은 MediaServer의
구조와 Apache-2.0 경계 안에서 독립적으로 재구현한다. 소스 코드를 직접 복사하지 않는다.

## 표준·오픈소스·지식재산 조사 게이트

저장 계약을 고정하기 전에 아래를 조사하고 결과를 설계 결정 기록으로 남긴다.

- [ONVIF Profile G](https://www.onvif.org/profiles/profile-g/)의 녹화 검색·재생 의미 체계
- [ONVIF Profile M](https://www.onvif.org/profiles/profile-m/)과
  [ONVIF Analytics](https://www.onvif.org/specs/2206/Analytics.html)의 UTC frame,
  object, appearance, behaviour 의미 체계
- [GStreamer `splitmuxsink`](https://gstreamer.freedesktop.org/documentation/multifile/splitmuxsink.html)의
  keyframe 경계 분할과 fragment finalize 동작
- Apache-2.0과 호환되는 공개 구현의 세그먼트·보존·복구 패턴
- 한국, 미국, 유럽 및 PCT 계열의 특허 위험 screening

특허 조사는 아이디어를 얻는 용도가 아니라 위험 접근을 제외하는 필터로만 사용한다.
활성 특허와 실질적으로 겹칠 가능성이 있으면 상세 구현을 설계 입력으로 사용하지 않고
해당 접근 전체를 제외한다. 제품 설계 근거에는 공개 표준, 권리 상태가 안전한 자료,
호환 오픈소스와 독립 설계만 남긴다. 불확실하면 기능을 축소하거나 구현을 보류한다.
이 기록은 법률 의견이나 FTO 검토를 대신하지 않는다.

## 버전 경계

| 버전 | 목표 | 이전 버전에서 소비하는 불변 기반 | 이 버전의 명시적 비범위 |
| --- | --- | --- | --- |
| v4.1.0 | Recording Foundation | 기존 EventRecord, FrameRef, event clip | 구조화 검색 UI, 임베딩, 자연어 질의 |
| v4.2.0 | Structured Search | v4.1 녹화 카탈로그와 분석 요약 | 벡터 유사도, VLM 판단 |
| v4.3.0 | Visual Vector Search | v4.1 FrameLocator, v4.2 결과 계약 | 증거 판단, Entity 확정 |
| v4.4.0 | Evidence Package | 녹화·프레임·트랙·이벤트 ID | VLM 결론, 교차 카메라 동일성 |
| v4.5.0 | VA Review | v4.4 불변 증거 패키지 | 교차 카메라 Entity 확정 |
| v4.6.0 | Correlation | track/event/evidence와 검토 결과 | 자연어 조사 UI |
| v4.7.0 | Natural Language Query API | 구조화·벡터·증거·상관관계 service | 대화형 제품 UI |
| v4.8.0 | Conversational Search & Playback | v4.7 QueryPlan/JSON response | 공개 API 호환성 종료 선언 |
| v4.9.0 | Stabilization & Public API | v4.1~v4.8 고정 계약 | 호환성을 깨는 major 변경 |

v5.0.0은 자동 조사 agent, 분산 검색 또는 호환성을 깨는 데이터 모델 변경처럼 실제
major 변경이 확인될 때만 별도로 설계한다. 현재 목표를 이유로 v4.7~v4.9를 건너뛰지
않는다.

## v4.1.0 — Recording Foundation

목표:

```text
상시녹화를 중단 없이 순환 보관하고 이벤트 구간을 우선 증거로 연결하며, 후속 검색이
원본 녹화 구조를 변경하지 않고 사용할 수 있는 시간·ID·분석 메타데이터 기반을 만든다.
```

| 단계 | ID | 우선순위 | 산출물 |
| --- | --- | --- | --- |
| 0 | V410-S00 | P0 | 표준·오픈소스·IP screening, 라이선스·provenance 기록, 최종 설계 freeze |
| 1 | V410-S01 | P0 | RecordingSegmentV1, FrameLocatorV1, EventRecordingLinkV1, AnalysisObservationV1 계약과 migration/rebuild 규칙 |
| 2 | V410-S02 | P0 | 채널별 opt-in 연속 세그먼트 recorder, keyframe 경계, atomic finalize, 재시작 복구 |
| 3 | V410-S03 | P0 | SQLite 메타데이터 카탈로그와 append-only JSONL 복구 저널, SQLite 미사용 fallback |
| 4 | V410-S04 | P0 | 상시/이벤트 용량 분리, oldest-first 순환 삭제, pin·tombstone·disk reserve·cleanup audit |
| 5 | V410-S05 | P0 | 이벤트와 겹치는 원본 세그먼트 연결, pre/event/post 파생 clip, frame-buffer fallback |
| 6 | V410-S06 | P0 | event > continuous 우선 조회·재생 계약, timeline API와 Ops UI 표출 |
| 7 | V410-S07 | P1 | event/track 경계·요약과 설정 주기 대표 관측 저장, 정확한 frame seek 기반 |
| 8 | V410-S08 | P0 | crash/disk-full/corrupt catalog/gap/migration/호환성 검증과 문서·evidence 연결 |
| 9 | V410-S09 | P0 | 사용자 승인 범위의 안정화·UI·장시간 녹화·release readiness 판정 |

V410-S00 완료: 공개 표준과 라이선스 metadata, 특정 특허 상세를 반입하지 않는 IP
clean-room 차단선, source `4.1.0` baseline을 고정했다. 녹화 계약과 제품 기능은
V410-S01부터 구현하며 S01~S09는 아직 시작하지 않았다.

v4.1.0에서 검색-ready 메타데이터를 저장하지만 검색 DSL, 검색 결과 랭킹, 벡터 인덱스,
자연어 해석은 구현하지 않는다. 객체의 모든 분석 frame을 무제한 저장하지 않고,
event/track 시작·종료·요약은 보존하며 중간 관측은 대표 frame 또는 설정 주기로 저장한다.

## v4.2.0 — Structured Search

1. v4.1.0 카탈로그를 소비하는 별도 read model을 만든다.
2. 카메라, 시간, 객체, track, event, zone, rule, behaviour filter를 제공한다.
3. 안정 정렬과 query checksum에 묶인 cursor pagination을 고정한다.
4. 검색 결과에서 원본 녹화의 정확한 시간으로 이동한다.
5. 같은 시간의 이벤트 녹화를 상시녹화보다 우선 반환한다.
6. v4.1.0 fixture를 수정하지 않고 migration·query compatibility를 검증한다.

## v4.3.0 — Visual Vector Search

1. image/text/cross-modal embedding contract와 contract ID를 versioning한다.
2. 이벤트 snapshot과 대표 frame부터 색인한다.
3. exact top-k를 기준 구현으로 먼저 두고 안정 정렬과 threshold를 고정한다.
4. 텍스트에서 영상 대표 frame을 찾는 cross-modal 검색을 추가한다.
5. 상시녹화의 설정 주기 대표 frame 색인을 후반 단계로 확장한다.
6. Hit@K, MRR, 지연시간, memory/disk 사용량 fixture를 유지한다.

임베딩은 파생 데이터이며 embedding contract가 바뀌면 새 공간으로 재색인한다. 오래된
벡터를 의미가 다른 새 contract로 자동 승격하지 않는다.

## v4.4.0 — Evidence Package

1. 검색 결과를 녹화, clip, 대표 frame, track, event, observation과 묶는 EvidencePackageV1을 고정한다.
2. `FrameLocatorV1`로 같은 frame을 결정적으로 다시 추출한다.
3. package manifest에 시간 범위, provenance, checksum, 누락·삭제 상태를 포함한다.
4. 원본 녹화가 순환 삭제돼도 보존 등급이 높은 파생 evidence의 독립성을 검증한다.

## v4.5.0 — VA Review

1. VARuleLens의 개념을 참고하되 MediaServer 내부에서 독립 구현한다.
2. 단일 이미지뿐 아니라 시간 순서가 있는 frame sequence를 입력으로 사용한다.
3. supports, questions, contradictions, unclear와 confidence를 구조화해 저장한다.
4. 외부 LLM/VLM 실패가 녹화, event, search 결과를 막지 않게 한다.
5. local-first와 provider opt-in 정책을 유지한다.

## v4.6.0 — Correlation

1. track과 event 위에 별도의 versioned EntityLink를 추가한다.
2. 같은 카메라의 시간 연속 관계부터 시작하고 교차 카메라 후보로 확장한다.
3. 자동 동일성 확정과 후보 관계를 구분하고 근거·불확실성을 보존한다.
4. 기존 track/event ID를 변경하거나 재사용하지 않는다.

## v4.7.0 — Natural Language Query API

1. 자연어를 `QueryPlanV1`으로 변환한다.
2. 시간대, 카메라 범위, 객체, 행동, 공간 관계, 결과 제한을 명시적으로 표현한다.
3. 구조화·벡터·증거·상관관계 검색을 하나의 application service에서 조합한다.
4. UI와 외부 client가 함께 사용하는 JSON response를 고정한다.
5. 결과마다 camera/time/track/event/evidence/recording/playback locator와 선정 이유를 반환한다.
6. 모호한 시간이나 조건은 임의 확정하지 않고 interpretation과 uncertainty를 반환한다.

## v4.8.0 — Conversational Search & Playback

1. GPT 형태의 자연어 입력 UI를 제공한다.
2. 결과 card에 카메라, 시간, 대표 image, 근거와 confidence를 표시한다.
3. 선택한 결과를 정확한 녹화 위치에서 재생한다.
4. 이벤트 clip이 있으면 이를 우선하고 없으면 원본 segment range를 재생한다.
5. 후속 질문은 기존 `QueryPlanV1`을 명시적으로 좁히는 방식으로 처리한다.
6. UI 전용 검색 로직을 만들지 않고 v4.7.0 application service만 소비한다.

## v4.9.0 — Stabilization & Public API

1. 자연어 표현과 camera/time/object/relation별 품질 fixture를 고정한다.
2. 다중 camera와 장시간 녹화에서 latency와 resource budget을 검증한다.
3. role/scope/camera 접근 권한, redaction, query·playback audit를 완성한다.
4. long-running query의 async state, cancel, timeout, pagination을 안정화한다.
5. v4.1.0부터의 schema migration과 이전 fixture compatibility를 검증한다.
6. 공개 API 문서와 semantic versioning 경계를 확정한다.

## 버전 간 재작업 방지 규칙

- ID는 path, SQLite rowid, 화면 순서에 종속시키지 않는다.
- ID는 삭제 뒤 재사용하지 않는다.
- UTC wall clock과 media PTS/time base를 모두 보존한다.
- segment는 finalize 후 불변으로 취급하고 교체가 필요하면 새 ID를 만든다.
- field의 기존 의미를 바꾸지 않고 optional field 또는 새 contract version을 추가한다.
- catalog migration은 forward migration과 JSONL rebuild를 함께 검증한다.
- 각 릴리즈의 golden fixture는 다음 릴리즈에서 수정하지 않는다.
- 검색, embedding, review, correlation은 source-of-truth가 아니라 재구축 가능한 projection이다.
- 다음 버전은 이전 버전의 application contract를 사용하고 내부 파일을 직접 해석하지 않는다.
- 호환성을 깨야 하면 minor 버전에서 숨기지 않고 별도 major 설계 승인을 받는다.

## 기존 v4.1.0 후보 재분류

기존 backlog의 Incident OS 제품 승격, Evidence default-on, 로컬 Action Execution,
credential store, tracker 기본 선택, 로컬 VLM 운영 경로는 이번 v4.1.0 범위가 아니다.
해당 항목은 삭제하지 않고 보류 후보로 유지하되, 사용자가 별도 버전과 순서를 승인하기
전에는 이 로드맵 단계에 자동 편입하지 않는다.

## 완료 판정 경계

이 문서의 단계는 계획일 뿐이다. 각 단계는 해당 구현, 관련 개별 테스트, 문서/evidence,
`git diff --check`, 영향·회귀 보고가 모두 갖춰져야 완료다. 안정화 테스트, 30분, UI
풀테스트, 120분, commit, push, PR, merge, tag, GitHub Release는 AGENTS.md와 사용자의
명시 승인 범위에서만 실행한다.
