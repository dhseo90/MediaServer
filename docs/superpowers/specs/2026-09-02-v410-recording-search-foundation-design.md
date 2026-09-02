# v4.1.0 녹화 기반과 v4.x 검색 확장 설계

## 문서 상태

이 명세는 2026-09-02에 사용자와 합의하고 승인한 아키텍처 방향을 기록한다. 구현, 테스트,
릴리즈 또는 완료 증거가 아니다. 공개 버전 순서는
[`docs/v410-v49-recording-search-roadmap.md`](../../v410-v49-recording-search-roadmap.md)에
요약한다. 단계별 파일·인터페이스·검증 순서는
[`2026-09-02-v410-recording-foundation-implementation-plan.md`](../plans/2026-09-02-v410-recording-foundation-implementation-plan.md)에
고정한다.

장기 로드맵은 v4.1.0 개발 변경에 포함하고, v4.1.0을 `main`에 머지할 때 공통
source-of-truth로 반영한다. 이후 릴리즈 브랜치는 장기 로드맵이 반영된 최신 `main`에서
생성한다. 로컬 `v4.1.0` 브랜치는 첫 구현 브랜치로 생성된 상태다. 별도로 승인된 구현
단계가 릴리즈 메타데이터를 변경하기 전까지 소스 버전은 `4.0.0`으로 유지한다. 이 문서는
구현, 테스트 실행, 커밋, 푸시, PR, 머지, 태그 또는 GitHub Release를 승인하지 않는다.

의도된 공개용 영문 문서를 제외한 프로젝트 문서의 기본 언어는 한글이다. 기술 식별자,
API 필드, 파일명, 표준 고유명사는 원문 표기를 유지할 수 있지만 설명과 판정은 한글로
작성한다.

## 문제 정의

MediaServer에는 이벤트 중심 프레임, 증거 manifest, 짧은 이벤트 clip 저장이 이미 있다.
그러나 상시녹화 archive는 없다. 단순히 영상 파일 목록만 추가하면 이후의 구조화 검색,
벡터 검색, 증거 검토, 자연어 검색 단계에서 녹화 모델을 다시 설계해야 한다.

따라서 v4.1.0은 상시녹화와 이벤트 연동 녹화를 제공하면서, 후속 릴리즈가 이미 승인된
v4.1.0 데이터 의미를 바꾸지 않고 사용할 수 있는 최소 안정 ID, 시간, lifecycle, 분석
메타데이터 계약을 함께 고정해야 한다.

## 승인된 제품 방향

- v4.1.0은 녹화 기능에 집중한다.
- 검색-ready 메타데이터 저장은 녹화 provenance의 일부이므로 v4.1.0 범위에 포함한다.
- 검색 DSL, 결과 ranking, embedding, 자연어 질의는 v4.1.0 기능이 아니다.
- 상시녹화는 채널별 opt-in이다.
- 상시녹화와 이벤트 녹화는 서로 다른 용량·기간 정책을 가진다.
- 설정 용량에 도달하면 삭제 가능한 가장 오래된 상시녹화 segment부터 제거하고 녹화를
  계속한다.
- 같은 시간 범위의 이벤트 녹화는 상시녹화보다 표출·재생 우선순위가 높다.
- 가능한 경우 이벤트 clip은 원본 상시녹화 segment에서 파생한다.
- 상시녹화에 공백이 있으면 기존 bounded event frame buffer를 fallback으로 사용한다.
- MyLocalLLM, VARuleLens, 공유 GPT 대화는 독립된 참고 자료로 유지한다. dependency,
  submodule, 동기화 대상 또는 별도 MediaServer 구성 저장소로 사용하지 않는다.
- 필요한 개념은 MediaServer 내부에서 독립 재구현하며 소스 코드는 복사하지 않는다.
- 저장소 라이선스는 Apache-2.0을 유지한다.
- 활성 특허 또는 불확실한 특허와 겹칠 가능성이 있으면 해당 접근을 제품 설계에서
  제외한다. 특허 정보는 위험 screening에만 사용하고 구현 아이디어로 사용하지 않는다.

## 검토한 저장 방식

### 선택: 불변 segment 파일과 재구축 가능한 로컬 catalog

미디어 stream은 finalize된 불변 segment로 기록한다. SQLite를 사용할 수 있으면 효율적인
로컬 transaction과 조회를 제공하는 catalog로 사용한다. append-only JSONL journal은
catalog를 재구축하는 데 필요한 mutation 이력을 보존하고 SQLite를 사용할 수 없을 때
최소 fallback을 제공한다.

이 방식은 현재 프로젝트의 optional SQLite/JSONL 패턴과 맞고, local-first 배포를
단순하게 유지하며, 후속 검색 index가 녹화 source-of-truth가 아니라 projection으로
남도록 한다.

### 제외: 영상 파일과 JSON manifest만 사용

v4.1.0의 의존성은 가장 작지만 시간 범위 조회, cleanup transaction, crash recovery와
migration 비용이 커진다. v4.2.0이 녹화 모델을 소비하지 못하고 교체할 가능성이 높다.

### 보류: 녹화 DB로 PostgreSQL과 pgvector 사용

향후 가능한 벡터 backend와는 맞지만 local-first 녹화 릴리즈에 필수 외부 service와
운영 부담을 추가한다. 미래의 벡터 검색은 index adapter로 연결하며 v4.1.0 녹화 저장
방식을 결정하지 않는다.

## 구성요소 경계

### 녹화 계약

새 녹화 type은 이미 큰 `event_storage.cpp`에 계속 추가하지 않는다. 구현계획에서는
`recording` namespace 아래에 contract, catalog, recorder, retention, event link 단위를
분리한다. 각 단위는 자신의 역할과 interface를 독립적으로 검증할 수 있어야 한다.

안정화할 v1 계약은 다음과 같다.

#### `RecordingSegmentV1`

필수 의미:

- path, SQLite rowid, 화면 순서에 종속되지 않는 opaque `segment_id`
- `source_id`, `channel_id`, `stream_epoch_id`
- 시작 시각은 포함하고 종료 시각은 포함하지 않는 UTC millisecond 범위
- 결정적 seek에 필요한 media time base와 시작·종료 PTS
- container, codec 요약, byte 크기, checksum
- 공개 identity와 분리된 media locator
- `writing`, `finalized`, `deletion_pending`, `deleted`, `corrupt` lifecycle 상태
- `continuous`, `event` retention class
- contract version, 생성 시각, finalize 시각

finalize된 segment는 불변이다. 교체가 필요하면 새 segment ID를 만든다. 삭제된 ID는
재사용하지 않는다.

#### `FrameLocatorV1`

필수 의미:

- `segment_id`
- frame UTC millisecond
- frame PTS와 time base
- 알 수 있을 때 frame index
- 알 수 있을 때 keyframe PTS 또는 동등한 seek anchor

public identity로 filesystem path를 노출하지 않고 같은 frame을 결정적으로 추출할 수
있어야 한다.

#### `EventRecordingLinkV1`

필수 의미:

- `event_id`
- 요청된 pre/event/post UTC 범위
- 시간순으로 정렬된 겹치는 segment ID와 overlap 범위
- 존재할 때 파생 event clip ID와 상태
- 상시녹화 공백이 있을 때 fallback evidence 참조
- 표출 우선순위 `event`

관계는 many-to-many다. 하나의 event가 여러 segment와 겹칠 수 있고 하나의 segment가
여러 event와 겹칠 수 있다.

#### `AnalysisObservationV1`

필수 의미:

- opaque `observation_id`
- `FrameLocatorV1`
- track ID, class ID/name, confidence, normalized bounding box
- optional zone, line, rule, scenario, event 참조
- observation source와 schema version
- 대표 frame 또는 sampling 선정 사유

v4.1.0은 모든 event·track의 시작, 종료와 요약을 저장한다. 중간 observation은 대표
frame 또는 설정 interval로 sampling한다. 분석되는 모든 frame을 제한 없이 저장하는
방식은 허용하지 않는다.

#### `RecordingTombstoneV1`

필수 의미:

- 삭제된 segment 또는 clip ID
- source/channel과 삭제 전 UTC 범위
- 삭제 시각과 사유
- retention class
- 존재했던 checksum 또는 integrity 참조

tombstone은 오래된 link가 왜 재생되지 않는지 설명하고 ID 재사용을 막는다. 이는 작은
metadata record이며 삭제된 영상을 숨겨 보존하는 수단이 아니다.

### Segment recorder

recorder는 기존 RTSP/WebRTC media contract를 변경하지 않고 encoded stream을
소비한다. temporary location에 기록하고, 설정 duration을 기준으로 재생 가능한 keyframe
경계에서 분할하고, container를 finalize하고, 최종 metadata를 계산한 다음 segment를
atomic publish하고 catalog mutation을 기록한다.

활성 codec/container 경로가 지원하면 GStreamer `splitmuxsink`를 우선 구현 수단으로
검토한다. 다만 built-in file count 삭제는 retention 권한을 갖지 않는다. MediaServer는
상시/이벤트 보존 등급, pin, tombstone, disk reserve, audit를 별도로 처리해야 한다.

비정상 재시작 뒤에는 temporary 파일과 finalize된 파일을 검사한다. 복구 가능한
finalized media는 catalog에 다시 연결한다. 불완전 media는 안전하게 finalize하거나
`corrupt`로 표시하며, 파일이 존재한다는 이유만으로 정상 재생 대상으로 반환하지 않는다.

### Catalog와 journal

SQLite가 compile된 환경에서는 SQLite를 primary query catalog로 사용한다. schema
version, transaction, foreign key와 지원 가능한 WAL을 사용한다. JSONL journal은
append-only이며 다음과 같은 idempotent domain mutation을 기록한다.

- segment finalized
- event link created
- deletion requested
- deletion completed
- corruption detected

journal만으로 catalog를 재구축할 수 있어야 한다. 파괴적인 lifecycle 변경을 SQLite
row에만 기록하지 않는다. 같은 journal entry를 여러 번 replay해도 최종 상태가 같아야
한다.

SQLite가 없어도 녹화와 journal 저장은 계속한다. 최소 range/status 조회는 journal scan
또는 bounded in-memory projection으로 제공할 수 있다. SQLite가 없는데도 v4.2.0의 전체
검색 기능이 가능한 것처럼 표시하면 안 된다.

### Retention coordinator

retention 입력은 다음을 포함한다.

- 채널별 녹화 enabled 상태
- 상시녹화 용량 및 기간 제한
- 이벤트 녹화 용량 및 기간 제한
- store 단위 reserved free space threshold
- 기존 제품 정책의 pin 또는 이에 준하는 보존 상태

일반 정리는 삭제 가능한 가장 오래된 finalized 상시녹화 segment부터 제거한다. 이벤트
파생 clip을 상시녹화 quota 충족 목적으로 삭제하지 않는다. 이벤트 clip은 자신의 정책에
따라서만 삭제하며 pinned 상태에서는 자동 삭제하지 않는다.

삭제는 다음의 복구 가능한 상태기계로 처리한다.

```text
finalized -> deletion_pending -> media removed -> deleted tombstone
```

media 삭제가 실패하면 `deletion_pending`을 유지하고 오류를 표출하며 공간이 회수됐다고
계산하지 않는다. 삭제 가능한 항목으로 reserve를 복구할 수 없으면 해당 채널 녹화만
명시적인 `storage-blocked` 상태로 전환한다. live media와 영상분석은 계속 동작한다.

### Event recording linker

event가 dispatch되면 설정된 pre/event/post 범위와 겹치는 모든 finalized 상시녹화
segment를 찾는다. 파생 media 작업을 예약하기 전에 `EventRecordingLinkV1`을 기록한다.
codec과 경계 조건이 허용하면 재인코딩 없이 overlap 구간을 remux해 event clip을 만든다.

archive가 불완전하면 기존 event frame buffer가 fallback clip/evidence를 만든다. link는
사용한 원본과 누락 범위를 기록한다. 일부 구간만 존재하는 clip을 complete로 표시하지
않는다.

### 녹화 read service와 UI

녹화 read service는 directory listing이 아니라 논리적인 timeline entry를 반환한다.
event와 continuous media가 같은 시간을 포함하면 event clip을 primary playback target으로
선택하고 continuous 원본은 provenance/fallback으로 유지한다.

Ops timeline은 녹화 종류, 시간 범위, 완전성, retention 상태와 playback 가능 여부를
표시한다. v4.1.0에는 자연어 또는 벡터 검색 control을 추가하지 않는다.

## 데이터 흐름

```text
encoded channel stream
  -> continuous segment recorder
  -> temporary segment
  -> finalized immutable segment
  -> journal mutation
  -> SQLite/in-memory catalog projection

VA observation/event
  -> sampled AnalysisObservationV1
  -> event recording linker
  -> overlapping RecordingSegmentV1 IDs
  -> derived event clip 또는 frame-buffer fallback
  -> event-priority logical timeline entry

retention tick 또는 low-space signal
  -> 올바른 retention class에서 oldest eligible item 선택
  -> deletion_pending journal entry
  -> media 제거
  -> tombstone journal entry
  -> catalog projection 갱신
```

## 설정 방향

정확한 환경변수와 config key는 구현계획에서 고정하지만, 설정 계약은 다음 의미를
보존해야 한다.

- global 기본값과 지정하지 않은 채널의 기본값은 disabled
- 명시적인 recording root
- segment duration
- continuous capacity/duration
- event capacity/duration
- reserved free bytes
- representative observation interval
- recorder 시작 전에 음수, 위험한 중복, 쓸 수 없는 경로와 잘못된 정책 값을 거부하는
  validation

문서화되지 않은 hard-coded retention 용량이나 기간을 제품 약속으로 사용하지 않는다.

## 실패와 복구 동작

| 실패 | 필수 동작 |
| --- | --- |
| Segment finalize 실패 | 실패 상태를 기록하고 live path는 유지하며 invalid segment를 finalized로 공개하지 않음 |
| SQLite 사용 불가 | degraded catalog 상태를 표시하고 journal/recording 경로는 계속 동작 |
| JSONL journal 기록 실패 | durability를 성공으로 보고하지 않고 오류를 표출하며 파괴적 transition을 중단 |
| Disk quota 도달 | 가장 오래된 삭제 가능 상시녹화를 제거하고 계속 녹화 |
| Disk reserve 복구 불가 | 해당 녹화 write만 중단하고 live/VA path 유지 |
| Event 범위에 공백 존재 | 가능한 경우 frame-buffer fallback을 사용하고 불완전한 원본 범위 보고 |
| Media 파일 누락 | corrupt/deleted 상태로 표시하고 playable locator를 반환하지 않음 |
| 삭제 중 재시작 | `deletion_pending`에서 idempotent하게 재개 |
| Catalog 손상 | journal과 filesystem integrity scan으로 재구축 |

## 호환성 규칙

- 모든 persistent contract는 명시적인 schema version을 가진다.
- v4 major 안에서 기존 field의 의미를 바꾸지 않는다.
- 이전 reader가 안전하면 additive optional field를 추가할 수 있다.
- 의미 변경은 새 contract version과 명시적 migration으로 처리한다.
- v4.1.0 golden data fixture는 모든 후속 버전에서 read-only 입력으로 사용한다.
- 후속 structured/vector/evidence/review/correlation store는 녹화 파일을 직접 해석하지
  않고 application contract를 사용한다.
- 모든 후속 index는 안정적인 v4.1 ID를 key로 하는 재구축 가능한 projection이다.
- migration은 crash-safe해야 하며 journal rebuild parity를 함께 검증한다.

## Main과 릴리즈 브랜치 책임

v4.1.0의 장기 로드맵 변경은 v4.1.0을 머지할 때 `main`에 함께 반영한다. 그 뒤 `main`이
장기 로드맵과 버전 간 contract 규칙을 소유한다. 각 릴리즈 브랜치는 이 문서를 상속하지만
자신의 버전 절만 구현한다. 후속 버전 절은 현재 stable interface가 필요한 이유와
downstream consumer를 설명하는 문맥이며 후속 기능 구현 권한이 아니다.

구현 evidence로 장기 버전 경계를 바꿔야 한다고 확인되면 사용자와 재조율하고, 다음
브랜치를 만들기 전에 `main`의 공통 로드맵을 먼저 갱신한다. 릴리즈 브랜치를 닫을 때는
해당 버전의 구현, 미구현, 검증 상태만 갱신하며 후속 절을 완료로 표시하지 않는다.

모든 후속 릴리즈 브랜치는 승인된 최신 `main`에서 시작하고 다음을 상속한다.

- 이 장기 로드맵과 설계 문맥
- 이전 버전의 불변 contract fixture
- migration과 rebuild 호환성 test
- 명시적인 non-goal과 보류 후보

이를 통해 현재 버전 개발 범위는 좁게 유지하면서 후속 consumer는 항상 확인할 수 있다.

## v4.2.0~v4.9.0 소비 모델

- v4.2.0은 v4.1 contract 위에 구조화 read model과 index를 추가한다.
- v4.3.0은 image/text/cross-modal embedding을 별도 version으로 추가한다. event snapshot과
  대표 frame부터 시작하고 설정된 continuous sample로 확장한다. MyLocalLLM의 개념을
  참고하되 코드를 복사하지 않고 stable sort, query-bound cursor와 측정 가능한 품질
  gate를 독립 구현한다.
- v4.4.0은 불변 evidence package와 결정적 frame sequence를 만든다.
- v4.5.0은 VARuleLens의 구조화 VA review 개념을 독립 구현한다.
- v4.6.0은 Track/Event를 변경하지 않고 versioned candidate Entity link를 추가한다.
- v4.7.0은 `QueryPlanV1`과 playback locator를 포함하는 JSON query response를 고정한다.
- v4.8.0은 v4.7 application service만 사용해 대화형 검색과 정확한 시간 재생을 만든다.
- v4.9.0은 품질, 규모, auth/scope, audit, async query lifecycle과 공개 API 호환성을
  안정화한다.

## 자연어 질의 최종 상태

`3시에 자동차 근처에 서성인 사람 찾아줘` 질의는 다음 조건으로 표현할 수 있어야 한다.

- timezone을 포함한 명시적 시간 범위
- person과 vehicle 객체 predicate
- 공간 관계 `near`
- loitering/dwell 행동 predicate
- optional camera scope와 result limit

각 결과는 안정적인 camera/channel, UTC 범위, track/event/evidence 참조, score, 사람이
읽을 수 있는 선정 이유, uncertainty와 playback locator를 반환해야 한다. playback은 event
clip을 먼저 사용하고 없으면 continuous segment를 사용한다.

deterministic local interpreter는 지원되는 시간, 객체, 행동, 관계 grammar를 처리한다.
local 또는 external LLM adapter는 해석 범위를 넓힐 수 있지만 동일한 `QueryPlanV1`을
출력하고 validation을 통과해야 한다. provider 출력은 scope, authorization 또는 query
validation을 우회하지 못한다.

## 오픈소스와 지식재산 정책

- MediaServer는 Apache-2.0을 유지한다.
- 검토한 오픈소스 revision마다 license와 참고 범위를 기록한다.
- GPL, AGPL, source-available 또는 license가 없는 구현 코드를 이 저장소에 복사하지
  않는다.
- permissive source도 기본적으로 복사하지 않고 공개 동작과 표준을 기반으로 독립
  구현한다.
- model weight, codec, GStreamer plugin, optional runtime은 별도 upstream license와
  bundle policy를 유지한다.
- 특허 screening은 KR, US, EP, PCT family를 대상으로 한다.
- 활성 또는 불확실한 특허 고유 구현 정보는 engineering design에서 격리한다. 기능은
  재설계, 축소 또는 보류한다.
- 비상업·오픈소스 공개를 copyright, license 또는 patent의 자동 면제로 간주하지 않는다.

## 검증 전략

각 v4.1 단계는 focused failing contract/fixture test로 시작하고 자체 verifier 등록으로
끝나야 한다. 필수 coverage는 다음을 포함한다.

- contract serialization과 additive schema migration
- keyframe 경계 segment finalize와 seek 정확성
- SQLite/JSONL projection parity와 idempotent rebuild
- temporary/finalized/deletion-pending 상태의 restart recovery
- continuous/event quota 분리와 oldest-first eviction
- pinned event 보호
- disk-full과 reserve 복구 불가 동작
- 여러 segment에 걸친 event overlap
- frame-buffer fallback과 partial-range 보고
- event-over-continuous 표출·재생 우선순위
- sampled observation bound와 정확한 FrameLocator 추출
- 모든 후속 migration에서 v4.1 fixture 호환성

장시간 녹화, UI 풀테스트, 30분, 120분, release action, 커밋과 푸시는 AGENTS.md와
사용자의 명시 승인 범위에 따른다.

## v4.1.0 명시적 비범위

- 자연어 검색
- 구조화 검색 제품 UI
- vector 또는 embedding index
- Entity 또는 교차 카메라 identity correlation
- VARuleLens runtime 또는 저장소 통합
- MyLocalLLM runtime 또는 저장소 통합
- cloud LLM/VLM default-on 동작
- 참고 저장소의 소스 코드 복사
- 기존 v4.1 후보였던 Incident OS 승격, local action execution, credential store, tracker
  기본 선택, local VLM 운영 경로의 자동 포함

## 승인 경계

사용자는 2026-09-02에 이 설계 방향을 승인했다. 이 승인은 상세 구현계획 작성까지의
설계 gate를 통과한 것이며 구현, 테스트 실행, 커밋, 푸시, PR, 머지, 태그, 릴리즈 또는
후속 버전 브랜치 생성을 승인한 것은 아니다.
