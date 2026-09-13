# v4.1.0 녹화 기반과 v4.x 검색 확장 설계

## 문서 상태

이 명세는 2026-09-02에 사용자와 합의하고 승인한 아키텍처 방향을 기록한다.
`V410-S00`~`V410-S06`의 조사·계약·segment recorder·catalog/journal·순환 보존·이벤트
연결·timeline/재생을 구현했다. S07 분석 관측은 구현·단계 검증을 완료했다. 이 명세 자체는
S08 이후의 통합 안정화와 릴리즈 완료 증거가 아니다. S09는 2026-09-12에 종료·대체됐으며
성공 완료가 아니다. 같은 날 사용자 승인으로 S10-1 시간·식별 계약 방향을 채택했다.
아래 S10 절은 신규 구현의 설계 기준이다. S10-3A 원장 버전 차단·S10-3B 순서 예약 API와
S10-3C의 C1 시간 계약과 후속 2번의 입력 관측·명시 주입형 관리 writer 연결을 구현·단기 검증했다.
소비자 연결과 서버 기본 writer 전환은 후속 3번에 남아 있으며 전체 통합 완료가 아니다. 공개 버전 순서는
[`docs/v410-v49-recording-search-roadmap.md`](../../v410-v49-recording-search-roadmap.md)에
요약한다. 단계별 파일·인터페이스·검증 순서는
[`2026-09-02-v410-recording-foundation-implementation-plan.md`](../plans/2026-09-02-v410-recording-foundation-implementation-plan.md)에
고정한다.

장기 로드맵은 v4.1.0 개발 변경에 포함하고, v4.1.0을 `main`에 머지할 때 공통
source-of-truth로 반영한다. 이후 릴리즈 브랜치는 장기 로드맵이 반영된 최신 `main`에서
생성한다. 로컬 `v4.1.0` 브랜치는 첫 구현 브랜치이며 source version은 S00에서
`4.1.0`으로 정렬했다. 이 문서는
구현, 테스트 실행, 커밋, 푸시, PR, 머지, 태그 또는 GitHub Release를 승인하지 않는다.

의도된 공개용 영문 문서를 제외한 프로젝트 문서의 기본 언어는 한글이다. 기술 식별자,
API 필드, 파일명, 표준 고유명사는 원문 표기를 유지할 수 있지만 설명과 판정은 한글로
작성한다.

## 문제 정의

최초 설계 당시 MediaServer에는 이벤트 중심 프레임, 증거 manifest, 짧은 이벤트 clip 저장이
있었지만 상시녹화 archive는 없었다. 단순히 영상 파일 목록만 추가하면 이후의 구조화 검색,
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

기존 V1 및 S07 V2 계약은 다음과 같다. 기존 데이터 해석을 위해 보존하며, S10 신규 기록의
시간·식별 의미는 아래 「S10 시간·식별 계약」을 따른다. 기존 필드에 새 의미를 덮어쓰지 않는다.

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

S07 구현 시 기존 V1의 필수 locator/FK 의미를 유지한다. 영상 연결이 아직 없거나
손상·삭제·모호한 시간축인 관측까지 기록하기 위해 별도 `AnalysisObservationV2`를 추가한다.
V2는 원본 분석 PTS와 tracker namespace, 선정 사유 배열, 요약과 nullable locator 및
연결 불가 사유를 분리한다. 기존 V1 fixture와 reader를 변경하는 migration은 하지 않는다.
유한 대기열의 과부하에서는 주기 관측을 먼저 줄이고 중요 관측 거부도 명시적으로 집계한다.
저장 장애·무제한 입력 상황을 무손실 보존 성공으로 표시하지 않는다.

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
새 segment 예상 byte는 continuous quota와 store reserve 둘 다에 선반영하고,
채널 간 in-flight reserve를 직렬화해 동일 여유 공간의 중복 승인을 막는다.
tombstone 기록 실패로 남은 pending은 다음 retention tick에서 idempotent하게
재시도하며 한 채널의 pending 실패를 다른 채널과 격리한다. replay 시 경로 containment를
검사하고 실제 삭제는 `openat`/`unlinkat` dirfd 결박으로 검사-삭제 경쟁 조건을 막는다.
partial 실제 쓰기량은 물리 free와 예약에서 이중 차감하지 않으며 event quota와 continuous
writer admission은 독립 판정한다. SQLite 실시간 projection 실패는 JSONL fallback으로
내리고 다음 시작에서 journal로 재구축한다.

### Event recording linker

event가 dispatch되면 설정된 pre/event/post 범위와 겹치는 모든 finalized 상시녹화
segment를 찾는다. 파생 media 작업을 예약하기 전에 `EventRecordingLinkV1`을 기록한다.
codec과 경계 조건이 허용하면 재인코딩 없이 overlap 구간을 순차 쓰기 가능한 MPEG-TS로
remux해 event clip을 만든다.

archive가 불완전하면 기존 event frame buffer가 fallback clip/evidence를 만든다. link는
사용한 원본과 누락 범위를 기록한다. 일부 구간만 존재하는 clip을 complete로 표시하지
않는다.

구현된 bridge는 EventStorage JSONL 저장 opt-in과 녹화 opt-in을 분리하고, keyed bounded
worker에서 파생한다. `utc-ms` 또는 UTC/PTS anchor가 있는 `media-pts-ms`를 녹화 범위로
변환하고, anchor 없는 media PTS는 별도 range로 보존한 뒤 finalized segment의 실제 mapping이
하나로 결정될 때만 UTC로 승격한다. 불명확한 시간축을 wall clock으로 추측하지 않는다.
원본 목록 조회와 삭제 사이의
경쟁은 같은 channel/epoch의 finalized continuous segment를 원자적으로 hold하는 source
lease로 막는다. 파생 파일은 Event 등급 reservation과 UUID `.partial.<uuid>`를 사용하며,
partial leaf를 지목하는 v2 cleanup marker, no-replace finalize와 SHA-256 결정 event
link/segment ID로 crash/retry 중복을 방지한다. v2 marker가 지목한 단일-link partial만
재시작 정리하고 v1/foreign final·partial은 보존한다. marker 제거 뒤 terminal
resource-release pending을 내구 기록하며 source/output hold와 reservation이 모두 해제된
뒤에만 complete로 승격한다. 실제 remux 동안 admission lock을 풀어 다른 event의 선행 link
기록을 막지 않는다. source/output은 경로를 다시 열지 않고 fd에 결박하며, keyframe 때문에
넓어진 실제 범위는 출력 packet timestamp로 측정해 요청 범위와 별도로 보존한다.
EventRecord bounded queue보다 link journal 기록을 먼저 수행해 queue drop이 녹화 요청을
소실시키지 않게 한다.
hold 해제 뒤에도 terminal complete commit 전까지 catalog가 source/output 삭제 요청을
차단한다. 복구 중 후속 event/fallback 갱신은 단계를 보존하고 UTC 확장은
`deferred_requested_range`에 내구 대기시켜 기존 자원 정리 뒤에만 새 파생으로 전환한다.

S05에서 검증된 archive 입력 codec은 video-only H.264/MP4이며 파생 컨테이너는 MPEG-TS다.
VP8/WebM 상시녹화는
지원하지만 event seek/remux는 재생 가능성이 입증되기 전까지 fail-closed하고 provisional
frame-buffer fallback을 사용한다. fallback에는 ID뿐 아니라 내부 media locator를 함께
보존하며 derived Event clip이 완료되면 우선 재생 대상으로 승격한다.

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

## S10 시간식별 계약

### S10-1 승인 범위와 불변 조건

2026-09-12 사용자의 「권장 방향으로 진행」에 따라 다음 계약 방향을 채택한다.
이 절은 녹화 기반 개발자의 설계 source-of-truth이며 S10 구현·호환 검증에 따라 유지한다.
로드맵에는 상태만 기록한다. S10-2의 미확정 세부 정책을 승인·구현·검증 완료로 해석하지 않는다.

| 개념 | 고정한 의미 | 금지하는 대체 |
| --- | --- | --- |
| 물리 세그먼트 ID | 파일의 불변 identity. 삭제 뒤에도 재사용하지 않음 | 파일명·UTC·SQLite rowid를 공개 identity로 사용 |
| 미디어 연속 구간 ID | 동일한 미디어 시간축의 범위. 소스 실행 세대·명시적 불연속과 연결 | PTS 감소만으로 소스 재시작 판정 |
| UTC 매핑 구간 ID | 미디어 위치와 특정 출처 UTC의 대응 범위·버전 | 하나의 시작 anchor를 파일 전체에 무조건 외삽 |
| 영속 녹화 순서 | store 안에서 녹화 시작 등록 시 내구 발급. 번호 공백 허용·재사용 금지 | UTC·finalize 완료 순서·ID 문자열로 녹화 순서 추정 |
| 프레임 위치 | 세그먼트·트랙·미디어 위치와 필요한 중복 구분 정보 | UTC 또는 PTS 하나만으로 유일 프레임이라고 단정 |
| 시각 출처·품질 | 촬영 시각, 서버 수신 관측, 추정, 알 수 없음을 구분. 유효 범위와 불확실성 보존 | 알 수 없는 값을 0 또는 촬영 시각으로 승격 |

1. `stream_epoch_id`의 기존 의미는 유지한다. 새로운 연속 구간·매핑·순서는 버전이 명시된
   저장 계약으로 추가하며 C++/JSON 필드의 exact schema는 구현 전 호환 설계에서 고정한다.
2. 서버 관측은 구독자 큐 이전의 명시된 지점에서 기록한다. 캐시 재전달 시 원래 관측을 유지한다.
   이 관측은 네트워크 최초 도착이나 카메라 촬영 시각의 보장이 아니다. 처리 시각은 별도 진단값이다.
3. UTC 보정만으로 미디어 연속 구간을 끝내거나 정상 영상을 버리지 않는다. 키프레임 기반
   물리 분할과 UTC 매핑 경계를 분리하며, 한 파일 안에 여러 매핑 구간을 허용한다.
4. UTC 대응이 불명확해도 저장 가능한 미디어를 임의 폐기하지 않는다. 미디어 자체의 시간·형식
   불량 때문에 안전한 mux가 불가능한 경우는 별도 오류·공백으로 기록하고 정상 녹화로 꾸미지 않는다.
5. writer, snapshot, 분석 locator, 이벤트 연결, 조회·재생은 공통 시간 해석 계약을 소비한다.
   결과는 단일 위치·복수 후보·불확실·없음·삭제됨을 구분한다. 명확한 미디어 locator가 있으면
   UTC 역조회가 모호하다는 이유만으로 그 locator까지 무효화하지 않는다.
6. 이벤트 우선순위는 동일한 원본 녹화 범위와 연결된 media 사이에 적용한다. UTC가 같지만
   실제 영상이 다른 후보를 합치거나 숨기지 않는다. 자동 후속 세그먼트 재생 UI는 이번 범위 밖이다.
7. 신규 녹화의 용량 초과 삭제 순서는 영속 녹화 순서다. continuous/event quota, pin·hold,
   재생 보호, tombstone, disk reserve 경계는 유지한다. 기간 만료와 용량 삭제 순서는 별도 정책이다.
8. 파일·매핑·순서가 함께 복구 가능한 시점에만 정상 녹화로 공개한다. SQLite와 JSONL rebuild는
   동일한 identity·mapping·order를 복원해야 한다. 확정 매핑을 사후 시계 보정으로 덮어쓰지 않는다.
9. 기존 V1 파일·ID·확정 증거를 보존한다. 알 수 없는 과거 순서·촬영 시각은 생성하지 않는다.
   레거시 관리용 순서가 필요하면 안정적인 별도 순서와 출처를 기록하고 실제 녹화 순서와 구분한다.
   V1으로 표현할 수 없는 새 결과는 의미를 바꿔 반환하지 않고 명시적인 버전 호환 경계를 둔다.

선택 이유: 세그먼트 ID만 추가하는 방식은 UTC 매핑·삭제 순서 문제를 해결하지 못한다.
UTC를 강제로 증가시키는 방식은 관측 사실을 바꾼다. 시간·식별·순서를 분리하는 위 방식을 채택한다.
외부 저장소 코드나 특허 고유 구현을 반입하지 않았으며 법적 비침해 판정을 뜻하지 않는다.

### S10-2 입력 조사와 불연속 설계

상태: 입력 조사·판정 정책 모델·순수 UTC 실제 writer 특성 재현을 수행했다. 수치값은 아래
모델 버전 1의 보수적 설계 예산으로 선택했다. 실제 제품 통합의 정확도·무손실 보장은 검증 전이다.
S10-2의 설계·기존 동작 재현 산출물은 갖췄으며, S10-T01~09의 실제 신규 제품 합격은 아래와
같이 분리한다. 다음 저장/입력/소비자 구현을 자동 착수하지 않는다.

| 직접 확인한 위치 | 현재 동작 | 설계에 필요한 조치 |
| --- | --- | --- |
| `src/core/source_factory.cpp`, `BuildSampleFromGst` | 없는 PTS는 0, 없는 DTS는 PTS로 변환 | 변환 이전 원본 유효성·duration·불연속 정보를 별도 관측으로 보존 |
| `src/ingress/webrtc_source_session.cpp`, `BuildSampleFromGst` | 같은 PTS/DTS 대체 방식 | 같은 관측 계약 적용. 실제 외부 입력 검증은 별도 승인 대상 |
| `include/media_types.h`, `MediaSample` | pts/dts만 있고 원본 유효성·duration·관측 출처 없음 | 기존 필드 의미를 유지하는 optional 내부 관측 정보 설계 |
| `src/core/shared_stream.cpp`, `FanOut`·`AddSubscriberWithRole` | packet을 독립 queue와 GOP cache에 복사·재전달 | 관측 identity를 복사하고 재전달 시 새 시각·새 프레임으로 발급하지 않음 |
| `src/recording/recording_session_service.cpp`, writer 호출 | queue 처리 시 `NowMs()` 전달 | 수신 관측과 처리 시각 분리 |
| `src/recording/gstreamer_segment_writer.cpp`, `Push` | PTS 감소 시 epoch 변경, UTC 차이로 분할 | 미디어 연속성·분할 경과와 UTC 매핑을 독립 판정 |
| `scripts/internal/recording_segment_writer_smoke.cpp`, S09-LD02 | UTC와 PTS를 함께 되돌림 | 혼합 불연속 이력으로 보존. 순수 UTC 보정의 증거로 재사용하지 않음 |

설계 방침:

- 원본 timestamp 유효성은 GstBuffer에서 숫자로 변환하기 전에 수집한다. 기존 egress가 소비하는
  pts/dts/payload 값은 바꾸지 않는다. 내부 관측 전달이 source/cache/analysis 경로를 지나는 만큼
  「녹화 코드만 변경」으로 영향 범위를 축소하지 않는다.
- 같은 packet의 수신 관측 identity를 recorder와 분석이 공유하도록 한다. PTS 중복 시에는
  원래 packet/frame 상관관계가 보존된 경우에만 유일 locator를 만들고, 없으면 모호함을 반환한다.
- 시계 관측은 단조 시계 → 시스템 시계 → 단조 시계의 짝으로 읽어 측정 구간을 보존한다.
  시스템 시계 증가량과 단조 시계 증가량의 차이로 보정 후보를 판단한다. UTC와 PTS 차이를
  시계 보정 감지식으로 사용하지 않는다. 프로세스 재시작을 넘어 단조 시계 원값을 비교하지 않는다.
- PTS는 표출 순서, DTS는 디코딩 순서로 구분한다. 실제 source 재시작·segment/discontinuity
  신호를 함께 사용하며 PTS 감소 하나로 재시작하지 않는다. 손실 신호도 재시작과 자동 동치가 아니다.
- UTC 경계는 키프레임까지 미루지 않는다. 경계가 어느 프레임 사이인지 불확실하면 그 범위를 남긴다.
  재정렬 입력에서 단일 PTS 구간만으로 표현할 수 없는 매핑을 억지로 단순화하지 않는다.
- 시계 오차와 전송·buffer 지연에 의한 촬영 시각 오차는 별개다. 단조/UTC 측정 오차가 작다고
  촬영 시각 정확도를 보장하지 않는다. 입력 속도 변화와 지연 변화는 매핑 품질 문제로 분리한다.

GStreamer 공식 문서에서 PTS의 비단조 가능성, PTS/DTS/duration의 부재 가능성과 미디어
running-time의 별도 역할을 확인했다. 이는 위 독립 설계의 참고이며 외부 코드 도입이 아니다.
참고: [GstBuffer](https://gstreamer.freedesktop.org/documentation/gstreamer/gstbuffer.html),
[동기화 설계](https://gstreamer.freedesktop.org/documentation/additional/design/synchronisation.html).

#### S10-2 판정 정책 모델 버전 1

`scripts/internal/recording_time_policy_probe.h`는 설계 검증 전용 모델이며 제품에 연결하지 않는다.
다음 값은 장비 실측 최적값이나 촬영 시각 정확도가 아니라 bounded·보수적 판단을 위한 선택값이다.

| 항목 | 선택값/동작 | 선택 이유·한계 |
| --- | --- | --- |
| clock 짝 읽기 폭 | 5ms 초과면 Unknown | 스케줄링 지연을 보정으로 단정하지 않음. 유효 관측까지 억지 보간 금지 |
| clock 해상도 예산 | 관측당 1ms, 두 관측에 합산 | UTC ms 저장의 양자화 여유. 실제 clock 정확도 보장 아님 |
| 매핑 잔차 예산 | 50ms + 측정 오차 초과면 Remap | 오차를 무제한 누적하지 않음. 50ms 이내 촬영 시각 정확도 보장 아님 |
| 급격한 보정 후보 | 250ms + 측정 오차 + 경과×500ppm 초과 | 느린 drift와 분류 분리. OS/NTP 보정 원인 확정값 아님 |
| 매핑 관측 상한 | 물리 segment당 256개, 초과 후 unknown-tail | 과부하 때 매핑 정밀도만 낮추고 미디어 폐기·무한 metadata 증가 금지 |
| 마지막 frame 끝 | 원본 유효 PTS + 양수 duration, overflow 없음일 때만 확정 | 부재 시 Unknown. FPS 기본값·decoder 보정 간격·다음 PTS로 확정값 생성 금지 |

각 clock은 단조 구간 `[before, after]`와 그 사이 UTC를 가진다. 두 관측의 단조 중간점 차이를
`elapsed`, `ΔUTC - elapsed`를 잔차로 하고, 측정 오차는 두 구간 반폭 합 + 2ms로 계산한다.
부등식 경계는 초과(`>`)일 때만 전환한다. 인접 관측으로 급격한 보정 후보를 판정하고 마지막
확정 anchor와의 누적 비교로 Remap을 판단한다. 새 매핑은 관측 경계부터 적용하며 과거 anchor를
갱신하지 않는다. 서로 다른 프로세스·역전/겹친 단조 관측은 Unknown이다. 입력 PTS/속도는 이 식에
들어가지 않는다. 모델은 long double로 overflow를 피하며 제품 정수 ns 직렬화·연산은 후속 검증 대상이다.
상한 초과 unknown-tail은 새 유한 기록 하나로 표현하고 해당 segment의 추가 knot를 생성하지 않는다.
이 동작의 실제 저장량·복구 검증은 저장 구현 단계에서 수행한다.

연속성 판단은 기존 숫자 PTS가 아닌 원본 유효성·입력 세대·관측 ordinal을 사용한다.
동일 세대에서 DTS가 증가하고 PTS가 감소/중복하면 재정렬 후보이며 새 epoch가 아니다.
DTS 부재·후퇴·중복 또는 ordinal 충돌은 Unknown, 동일 관측 재전달은 Replay로 남긴다.
실제 세대 변경은 새 연속 구간이다. source worker 시작 외에도 파일 EOS seek(0), URI/YouTube
delegate 교체, WebRTC 재등록에서 세대 경계를 발급해야 한다. GstSegment/flush 경계의 실제
직렬 전달과 구독 cache 경계는 통합 시 검증하며, DISCONT 단독을 재시작으로 취급하지 않는다.

직접 대조 근거: `source_factory.cpp::BusLoop`는 같은 pipeline에서 파일 seek를 수행하고
`StartDelegate`는 같은 SharedStream 내부에서 source를 교체한다. `raw_video_decoder.cpp`의
`NormalizePacketForDecoder`는 DTS를 보정하며 `ResolveSourcePts`는 최근접 PTS를 선택한다.
따라서 decoder 보정값을 원본 duration으로, 최근접 PTS를 정확한 frame identity로 재사용하지 않는다.
명시적 상관관계가 없으면 분석 locator는 모호함을 보존한다. 이 기존 제품 동작은 이번에 수정하지 않았다.

exact 저장 schema·V1 API 호환·레거시 삭제 순서는 S10 저장/소비자 구현 전 고정할 경계다.
S10-2 모델 선택만으로 해당 계약이나 제품 통합이 완료됐다고 판정하지 않는다.

### S10-2 결정적 재현의 합격 기준

아래는 실행 전 정의이며 실행 결과가 아니다. OS 시계는 변경하지 않고 주입 가능한 clock을 사용한다.
기존 S09의 유효 검사와 실패 이력은 보존하고 관련 runner만 정리한다. 다른 버전 JS·증적 정리는 하지 않는다.

| ID | 입력 조건 | 반드시 확인할 결과 |
| --- | --- | --- |
| S10-T01 | 정상 PTS/DTS·일정한 clock offset | 정상 분할·유일 locator·기존 정상 미디어 보존 |
| S10-T02 | PTS/DTS 연속, 파일 중간 UTC만 4034ms 후퇴 | 영상 비폐기·매핑 분리·복수 UTC 후보 보존 |
| S10-T03 | 같은 후퇴를 키프레임 경계에 주입 | 물리 분할과 매핑 경계 독립, 프레임 중복·누락 없음 |
| S10-T04 | PTS/DTS 연속, UTC만 4034ms 전진 | UTC 공백을 영상 손실로 단정하지 않음·재생 순서 유지 |
| S10-T05 | DTS 증가·PTS 재정렬 및 중복 | PTS 감소만으로 재시작하지 않음·모호한 프레임 단일화 금지 |
| S10-T06 | 실제 source 세대 변경과 PTS 재설정 | 새 연속 구간·과거 위치 불변·경계 공백의 명시 |
| S10-T07 | cache replay와 recorder queue 지연 | 동일 관측 identity/시각 유지·처리 시각과 분리 |
| S10-T08 | 없는 PTS/DTS/duration과 실제 0 timestamp | 원본 부재와 유효 0 구분·끝 범위 임의 생성 금지 |
| S10-T09 | 완만한 clock drift·관측 지연·입력 속도 변화 | 시간 보정과 미디어 속도 문제 구분·오차/저장량 상한 확인 |

공통 실행 기록에는 주입값·실패 assertion·실제 매핑·세그먼트/프레임 수·원출력과 cleanup을 남긴다.
S10-T02의 4034ms는 과거 관찰 규모를 반영한 재현 입력이며 제품 감지 임계값이 아니다.
이 9개는 S10-2의 최소 재현 범위다. 원장 복구·순서·삭제·이벤트/분석·API 호환의 전체 S10
합격 검증을 대체하지 않는다. 사전 등록과 실제 결과 기록은 AGENTS.md 7장을 따른다.

실행 범위 대조: S10-T01~04는 실제 H.264 writer의 기존 동작을 S10-C01~04로 재현했다.
T05~09는 판정 모델 P01~P23과 source 직접 조사까지 수행했다. 실제 재정렬 mux, cache/분석
상관관계 전달, frame 끝·누락 없는 재생, bounded metadata 저장은 제품 통합 검증 전이다.
모델 23/23 및 실제 writer 118/118은 각 실행 범위의 PASS이며 위 9개 제품 합격 전수 PASS가 아니다.
실제 결과·RED 이력·cleanup은 [중앙 테스트 기록](../../release-test-records.md#s10-2-시간-판정-모델-사전등록-2026-09-12)에 보존한다.

## S10-3 저장·복구의 구현 순서와 호환 경계

S10-3은 S10-2 모델을 제품 PASS로 승격하지 않고 다음 순서로 적용한다.

1. S10-3A: 미지원 원장 schema/type를 일반 손상과 분리하고 catalog 시작을 거부한다.
   새 record를 조용히 건너뛴 부분 복구를 방지하는 선수 작업이다. 이 경계는 구현·단기84검사를
   통과했다. 변경은 `RecordingJournal::Replay`, `RecordingCatalog::Open/RebuildSqliteLocked`이며
   개별 결과는 중앙 테스트 기록 S10-3A 절에 보존한다.
2. S10-3B: store identity와 영속 녹화 순서를 발급한다. store의 단일 쓰기 소유권·원장 잠금 안에서
   할당과 내구 기록을 묶는다. `Replay()`와 `Append()`를 별도 호출하는 read/modify/write로 구현하지
   않는다. 성공 응답 전 durable 보존, 같은 요청의 idempotent 재시도, 충돌·counter overflow 거부를 검증한다.
   손상·미지원·미확인 꼬리를 무시한 max+1 발급은 금지한다. 실패한 발급으로 생긴 번호 공백은 허용한다.
3. S10-3C: segment의 미디어 identity·순서·UTC 매핑을 하나의 버전 계약과 finalize ready 증명에
   결박한다. 파일 publish와 journal commit 사이 재시작도 동일 정보를 복원해야 하며 누락된 매핑을
   V1 anchor로 생성하지 않는다. SQLite projection과 JSONL rebuild의 동등성, tombstone 보존을 검증한다.

S10-3A의 시작 거부는 새 코드가 이해하지 못하는 데이터를 발견했을 때의 보호다. 과거 바이너리가
새 store를 열지 못하게 하는 downgrade 보호까지 완료한 것은 아니다. S10-3B/C에서 새 기록을
활성화하기 전에 store format/쓰기 소유권/이전 binary 접근 제한을 결정한다. 기존 V1 store는 그대로
읽을 수 있어야 하며, 별도 승인 없이 기존 데이터를 새 형식으로 덮어쓰지 않는다.
S10-3B의 저장 API는 구현·한정139검사를 통과했으며 세부 고정 계약은 기존 구현계획의
「S10-3B 영속 순서 예약 저장 API」 절을 따른다. writer에는 아직 연결하지 않는다. 이 원장 잠금은
예약 트랜잭션 직렬화이며 store 전체의 쓰기 소유권 또는 구형 binary 차단 완료가 아니다.
S10-3C는 V2 계약135개, catalog172개, ready 복구52개 한정 검증을 통과했다.
미디어 identity·예약 순서·UTC mapping의 원문 의미를 별도 V2 저장에 보존하고,
ready는 검증→파일 최종화→원장 저장→정리 순서로 복구한다. V1 계약은 유지한다.
V2 저장은 기본 비활성이다. writer 입력 연결·분석/조회 소비자 통합과 S11은 미구현·미실행이다.

## S10 3C-5 파생 영상 계약 (2026-09-13)

독자는 3C-5 구현·검토 담당자다. 이 절은 파생 영상의 설계 기준이며 구현·검증 완료 증거가 아니다.
앞의 S10-3 구현 상태는 당시 기록이다. 현재 소비자 참조는 3C-4까지 연결됐지만 파생 출력과
자원 복구는 미구현이며, 서버 기본 전환은 3D, 최종 검증은 S11이다. 상세 직렬화 필드와
검증 항목은 아래 불변 조건에 맞춰 구현 전에 등록한다. 새 공개 API는 추가하지 않는다.

### 선택과 근거

기존 UTC 기반 deriver에 새 PTS를 넣는 방식은 배제한다. 단일 원점 차이만 적용하는 방식도
B-frame·decoder fallback·시각 역행 경계를 설명하지 못하므로 채택하지 않는다.
**원본 참조 → 증거가 있는 구간 선택 → 실제 출력과 출처 기록 → 내구 복구**를 분리한다.
기존 journal/SQLite projection/ready 구조를 확장하며 별도 DB나 외부 의존성은 도입하지 않는다.

근거는 [파일 시각 실측](../../release-artifacts/v4.1.0/s10-derived-time-probe/report.md),
[요청 보존 검증](../../release-artifacts/v4.1.0/s10-consumer-request-admission/report.md),
`RawVideoDecoder::ResolveSourcePtsLocked/PullLoop`, `RecordingReadService`의 참조·구간 조회,
`GStreamerEventClipDeriver::Derive`, `RecoverFinalizeReadyTickets`다.
실측의 8개 PASS는 측정 실행 결과다. AU decode-order 대조는 payload 동일성 증거가 아니며,
B-frame의 file PTS/stream-time 200ms 차이와 일부 duration의 1ns 차이는 보편 상수가 아니다.
실제 seek·새 파생 출력·중단 복구는 아직 검증하지 않았다.

### 1. 요청 사실과 구간 판정을 분리한다

- 기존 consumer reference의 요청 start/end/pre/post와 time basis를 불변으로 보존한다.
  구간은 반열림 `[start, end)`이다. pre-roll 확장 결과가 음수여도 요청을 0으로 덮어쓰지 않는다.
  단위 변환·확장 산술은 overflow를 검사한다. 원본 PTS 부재와 유효 0을 구분한다.
- 참조 한 점의 `timestamp-match`는 전체 구간 대응이나 프레임 identity를 증명하지 않는다.
  `nearest`/`ambiguous`/`unavailable`을 정확한 위치로 승격하지 않는다.
- `media-pts-ms`는 해당 분석 namespace·source generation·track의 시간 의미를 확인한 뒤
  원본 구간으로 해석한다. decoder가 숫자 PTS를 복원하거나 가까운 값으로 대체하므로
  현재 한 점에서 얻은 offset을 요청 전체로 외삽하지 않는다. 직접 대응과 그 유효 구간을
  증명하는 내부 증거 연결이 생성 구현의 선수 작업이다. decoder 정규화 자체는 변경하지 않는다.
- `utc-ms`는 저장된 piecewise UTC mapping으로 해석한다. 시각 역행으로 생긴 복수 후보를
  최초/최신 한 개로 자동 축약하지 않는다. 매핑 품질과 불확실성을 결과에 유지한다.
- 판정은 확정 구간, 대응 미확인, 증명된 공백, 삭제된 원본을 구분한다. post-roll 대기와
  미래 입력이 해결할 수 없는 미확인을 같은 무기한 재시도 상태로 묶지 않는다.
  한 후보가 있다는 이유만으로 전체 coverage나 재생 가능성을 확정하지 않는다.

### 2. 생성 단위와 실제 범위

- 생성 입력은 request reference와 선택 근거, store/source/epoch/track, 순서, segment ID,
  원본 media 범위, 파일 식별·무결성 정보다. 경로만으로 원본을 식별하지 않는다.
- 같은 epoch에서도 codec 설정·track·연속 coverage가 확인된 인접 구간만 한 출력으로 묶는다.
  epoch 변경·공백·미확인·호환되지 않는 codec 경계는 별도 출력 단위다. 복수 출력 목록은
  보존하지만 연속 재생 UI나 공백 없는 단일 영상으로 꾸미지 않는다. 모호한 후보는 자동 생성하지 않는다.
- 첫 구현 프로파일은 기존 H.264/MP4 입력과 MPEG-TS video-only remux 경로를 대상으로 한다.
  재인코딩·새 codec·오디오 동기화 확대는 제외한다. audio 제외 이유를 보존하고 미지원 입력은
  명시적으로 반환한다. 이 프로파일의 실제 출력·재생 적합성은 구현 검증 전에는 PASS가 아니다.
- 원본 PTS, 파일 PTS/DTS, GStreamer segment/stream-time, 출력 PTS/DTS를 서로 다른 축으로
  기록한다. seek 인자는 확인된 파일 변환으로 계산한다. UTC 차이·고정 200ms로 대신하지 않는다.
  timebase는 정수 유리수로 취급하고 rounding 방식과 변환 잔차를 남긴다. 1ns를 일괄 무시하지 않는다.
- keyframe/decode preroll과 종료 경계 때문에 실제 출력이 요청과 다를 수 있다. 요청 범위,
  실제 포함 범위, 디코딩에 필요한 추가 범위, 미충족 범위와 이유를 따로 기록한다.
  duration을 알 수 없으면 끝을 FPS나 다음 PTS로 발명하지 않는다. 검증 불가능한 출력은 ready가 아니다.
- 출처 기록은 실제 포함된 원본 AU의 식별/대응 근거와 출력 위치를 추적할 수 있어야 한다.
  압축된 span은 동일 대응이 성립하는 구간에서만 허용한다. payload 대응 또는 동등한 직접 증거와
  실제 decode 검증으로 재정렬·누락·중복을 확인하며 decode-order 번호만으로 동일 프레임이라 하지 않는다.
  metadata 크기와 작업 자원은 유한 상한을 두고 초과 시 실패한다. 증거를 잘라 성공시키지 않는다.

### 3. 내구 작업과 자원 소유권

- 논리 작업 ID는 불변 요청 참조·확정 선택·프로파일에 결박한다. 동일 입력 재시도는 같은 작업,
  요청 갱신·선택 변경은 새 작업이다. 실행 attempt ID와 최종 출력 ID를 구분한다.
- 생성 시작 전에 작업 의도·원본 보호 토큰·출력 용량 예약을 하나의 원장 mutation으로 내구 기록한다.
  예약은 기존 event 용량/disk reserve 정책 안에서 확보한다. 자원 부족 시 생성하지 않는다.
  pin/사용자 hold를 작업 토큰으로 해제하지 않으며 재시작 때 보호를 중복 가산하지 않는다.
- 순서는 의도/예약 → 소유 임시 파일 생성 → 실제 출력·출처 검증 및 내구 저장 → ready 내구 저장
  → no-replace publish → 출력·출처·작업 결과의 원장 commit → 소유 임시물/marker 정리
  → 작업 보호·예약 해제/종료다. publish와 원장 기록이 원자적이라고 가정하지 않는다.
  ready는 작업/attempt/출력/출처 hash/원본 선택/예약 토큰에 결박한다.
- 출력은 종료 정리까지 작업 보호를 유지한다. 원본 보호는 유효한 출력 commit 전 해제하지 않는다.
  실패 시에도 원인과 소유권을 보존하고, 확인된 임시물 정리 후 해당 작업 자원만 해제한다.
  결과 사용 가능 상태와 cleanup 완료 상태를 분리한다. cleanup 미해결은 단계 완료가 아니다.
- source hot path에서 생성·fsync·긴 잠금을 실행하지 않는다. bounded 작업 큐와 worker를 사용하며
  큐 포화·중단·재시도 사유를 남긴다. 재시도에 상한을 두고 같은 손상 입력을 무한 반복하지 않는다.

### 4. 재시작과 삭제 경쟁

catalog 원장 복구 → 미종료 작업의 보호/예약 복원 → ready·실제 파일 대조/복구 →
writer·bridge·retention 활성화 순서를 지킨다. 기존 `RecoverFinalizeReadyTickets`만 호출해
예약까지 복구했다고 주장하지 않는다. 3D는 이 순서를 실제 서버 구성에 연결한다.

각 중단 지점에서 동일 job/attempt와 hash를 확인해 재개·완료·정리 중 하나로 수렴시킨다.
동일 ID/다른 내용, 원본 소실·손상, 다른 작업 파일, 경로 이탈은 덮어쓰기나 임의 삭제가 아닌 오류다.
SQLite rebuild/checkpoint/JSONL replay에서 같은 작업·보호·예약 상태가 복원돼야 한다.
완료 뒤 보존 정책으로 삭제된 출력은 tombstone으로 남기고 재시작만으로 재생성하지 않는다.
재생 보호와 삭제 판단은 기존 catalog의 원자 경계를 유지한다.

### 5. 구현 순서와 완료 기준

3C-5.4의 내부 접수 표지는 canonical reference에 결박해 원장에 보존한다. 큐 슬롯과
내구 접수가 확인된 뒤 작업자에 공개하며, 분석 구간 증거 자체의 내구 저장을 의미하지 않는다.
재시작 시 접수만 있고 job이 없으면 증거 소실에 따른 확인 불가다. 이미 소유한 요청과
소유권 조회 실패는 기존 clip fallback으로 넘기지 않는다. 이 억제 표시는 내부 전용이며
공개 EventRecord에 새 필드를 넣거나 기존 레코드를 비동기로 재작성하지 않는다.
현재 reference 조회는 모든 반환 job/output과 각 catalog 가용성을 구분한다. 가용성은
현재 파일 hash·재생 검증을 의미하지 않으며, 목록 상한 초과도 명시한다. 여러 파일 중
첫 파일을 전체 요청의 단일 clip으로 승격하지 않는다. 기본 legacy와 snapshot hook은 유지한다.
원본 후보는 같은 catalog 잠금에서 source/channel·상시녹화·binding·lifecycle를 대조한다.
관련 없는 과거 구간만 증명해 제외한 뒤 상한을 적용하며, 삭제·손상·미확인 후보는 숨기지 않는다.
내부 선택 가능 여부는 UTC/미디어 양쪽에 적용하고 기존 저장 identity는 변경하지 않는다.

| 순서 | 작업 | 반드시 확인할 결과 |
| --- | --- | --- |
| 3C-5.1 | 요청 구간 증거 연결·선택 및 내부 작업/출처 계약 | 한 점 외삽 금지, pre/post·음수 확장·overflow·복수 후보·epoch·공백 판정 |
| 3C-5.2 | 실제 remux와 출력 출처 | 비영점 PTS·B-frame·분수 timebase·keyframe 경계·분할·실제 decode/seek, 요청/실제 범위 분리 |
| 3C-5.3 | 작업 원장·보호/예약·ready 복구 연결 | 모든 내구 경계 중단, 중복 재시도, 재시작, 손상/누락, quota·보존·재생 경쟁, 자원 회수 |
| 3C-5.4 | opt-in 경로 통합과 기록 정리 | 실제 이벤트→출력→재시작 결과, 기존 참조/관측·writer/보존 회귀, 실패 이력·cleanup 보존 |

위 표는 예정 합격 기준이며 실행 결과/테스트 등록을 대신하지 않는다. 구현 전에 개별 항목을
inventory와 중앙 기록에 등록한다. 새 경로에서 정상 이벤트가 미확인 상태로만 남는 구현은
3C-5 완료가 아니다. 단기 영향 검증 후 3D 기본 연결, 코드 고정 후 S11 증거 유효성 판정을 한다.
기존 증거를 설계 변경만으로 전부 폐기하거나 장시간/UI를 자동 실행하지 않는다.
최초 계약 확정 시점에는 문서화만 수행했다. 이후 구현·검증·커밋 상태는 실행 계획과
중앙 테스트 기록의 3C-5 절을 따른다. 이 설계 문서 자체를 실행 완료 증거로 사용하지 않는다.

## S10 3D-1 기본 구성·조회 소비 계약 — 2026-09-13 승인

독자는 3D 구현·검토 담당자다. 이 절은 현재 설계 계약이며 실행 순서는 구현계획,
실제 검증 결과는 중앙 테스트 기록, 작업 권한은 AGENTS를 따른다. 최초 계약 확정 시 제품 적용은
미실행이었으며, 이후 3D-2 기본 구성 연결·단기 검증을 마쳤다. 3D-3 공개 소비는 미완료다.

### 식별·시간·표출 계약

- 채널·소스 참조 ID와 서버가 생성하는 미디어 opaque ID는 별도 의미다. 기존 채널·소스 값을
  접두어 추가·숫자 변환으로 재명명하지 않는다. 숫자형 참조를 입력→writer→원장→catalog→조회에서
  동일하게 허용하되 빈 값·길이·금지 문자·경로 이탈 검사를 유지한다. segment/store/epoch 등
  생성 ID의 숫자-only 거부는 완화하지 않는다. 참조 검증 적용부를 전수 대조해 한쪽만 바꾸지 않는다.
- 기존 timeline route와 channelId/startTimeMs/endTimeMs/offset/limit 입력 의미는 유지한다.
  요청 형식 변경이나 구버전 요청의 일괄 거부를 전제하지 않는다. 응답은 새 시간·복수 출력 상태를
  표현하도록 UI와 함께 적용하며 기존 응답과 무조건 호환된다고 주장하지 않는다. 영구 이중 저장 경로는 만들지 않는다.
- 확인된 UTC와 미확인 UTC를 구별한다. 미확인은 null 및 사유로 표현하고 0이나 요청 시각으로
  대체하지 않는다. 유효 UTC 0은 날짜이며 미확인이 아니다. ns와 정밀도가 필요한 64비트 정수는
  JSON 십진 문자열로 전달하고 UI 변환 시 범위·정밀도를 검사한다. UTC·원본 PTS·파일 PTS·timebase를 혼용하지 않는다.
- 시간 질의에서 위치를 확정할 수 없는 결과는 확인된 시간 행과 분리한다. 질의 구간에 속한다고
  추정하지 않으며 채널·권한·상한과 미확인 사유를 유지한다. 같은 UTC에 여러 미디어가 대응하면 모두 보존한다.
- 표시 항목의 식별은 파일 ID와 분리한다. 같은 파일의 다른 구간·매핑은 서로 다른 안정적인 항목 ID로
  선택하고 공통 event/reference 및 실제 output ID를 연결한다. 이벤트 아래 중첩 응답은 필수가 아니다.
  여러 출력 중 첫 파일을 전체 요청으로 대표시키지 않는다. 자동 다음 영상 재생은 이번 범위 밖이다.
- 이벤트 우선은 같은 원본 계보와 확인된 중첩 구간에만 적용한다. UTC 일치나 eventId 하나만으로
  상시녹화 전체를 숨기지 않는다. 비중첩·미확인·이벤트로 충족하지 못한 구간과 원본 보기 수단은 유지한다.
  표출 우선순위를 페이지에 우연히 포함된 이벤트 목록으로 결정하지 않는다.
- 작업 완료, 요청 충족(전체/일부/미확인), catalog 가용성, 실제 파일 제공 가능성, 브라우저 디코딩은
  각각 구별한다. 실제 media 요청에서 channel 권한·정확한 파일·출처·hold/삭제 경쟁을 재확인한다.
  원본용 검증을 단순히 Event 허용으로 완화하지 않는다. remux 성공이나 canPlayType만으로 UI 재생 PASS를 만들지 않는다.
- UTC 차이를 곧바로 HTML video currentTime으로 사용하지 않는다. 파일 시작 재생과 요청 구간 안내를
  구분하고 정밀 seek는 실제 매핑 증거가 있는 경우에만 제공한다. 미지원 형식은 명시하며 새 codec/변환 경로를 끼워 넣지 않는다.

### 적용 경계와 합격 기준

기본 연결은 기존 opt-in을 유지한다. 관리 원장/catalog/store, writer, 분석 증거 provider,
파생 작업 서비스의 소유·수명을 구성 루트에서 연결하고 복구를 생산자 시작보다 앞에 둔다.
종료는 신규 접수 차단→작업 취소·join→보호/예약 정리→의존 객체 해제 순서를 보장한다.
공개 Event POST/SSE/WS payload, auth/scope, RTSP/WebRTC 송출 계약, snapshot hook은 변경하지 않는다.

| 기준 ID | 합격 조건 | 제품 검증 담당 단계 |
| --- | --- | --- |
| S10-D01 | 숫자 참조 round-trip, 생성 ID 숫자-only 거부, 빈 값·경로 이탈 거부가 writer/journal/catalog/reference에서 일치 | 3D-2 |
| S10-D02 | opt-in off 비녹화, on 실제 생성, 복구 후 시작, 종료 중 접수·취소·보호 정리 및 재시작 | 3D-2 |
| S10-D03 | 기존 질의 입력 유지, 잘못된 범위 거부, 미권한 채널 거부·노출 없음 | 3D-3 |
| S10-D04 | UTC 0/unknown/복수 매핑/64비트 경계·범위 밖 UI 날짜를 구별하고 1970 대체·정밀도 손실 없음 | 3D-3 |
| S10-D05 | 복수 출력·같은 파일 다른 구간의 독립 선택, 재조회 식별 안정성, 페이지 경계에서 누락 없는 우선 표출 | 3D-3 |
| S10-D06 | 부분 중첩·같은 UTC 다른 원본·미확인 구간에서 원본 보존, 이벤트 우선·원본 보기 유지 | 3D-3 |
| S10-D07 | 완료 후 삭제/손상·재생 중 삭제 경쟁·권한 재확인, 작업 완료와 현재 재생 가능 상태 분리 | 3D-3 |
| S10-D08 | 실제 브라우저 영상 재생/미지원 안내·구간 표시·선택 상태 확인, 자동 연속 재생 없음 | 3D-3/S11 |

이 표는 합격 기준이며 실행 PASS가 아니다. 제품 테스트 실행 전에 각 기준을 실제 command/route/control과
연결해 inventory·중앙 기록에 개별 등록한다. 서버 구성과 조회 DTO의 세부 함수 변경은 해당 구현 단계에서
이 계약에 맞춰 TDD로 진행하며 새 공개 계약 결정이 필요하면 조용히 확대하지 않는다.

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
