# v4.1.0 녹화 기반 상세 구현계획

> **자동화 작업자 필수:** 이 계획을 실행할 때는 `superpowers:executing-plans`를 사용하고,
> 각 단계의 RED → GREEN → 문서/evidence → `git diff --check` 순서를 지킨다.

**목표:** 채널별 opt-in 상시녹화, 이벤트 연동 녹화, 이벤트 우선 표출·재생, 용량 초과 시
oldest-first 순환 삭제, 재시작 복구와 후속 검색용 안정 메타데이터 기반을 v4.1.0에서
완성한다.

**아키텍처:** 기존 `SharedStream`의 인코딩 packet fan-out에 전용 Recorder subscriber를
추가한다. 녹화기는 keyframe 경계의 불변 segment를 임시 경로에 쓴 뒤 atomic publish하고,
append-only JSONL journal을 내구성 원장으로, optional SQLite를 조회 projection으로 쓴다.
이벤트는 같은 UTC 범위의 segment를 연결·파생하고 기존 frame-buffer clip을 fallback으로
사용한다. UI/API는 filesystem 목록이 아니라 녹화 application service의 논리 timeline만
소비한다.

**기술 스택:** C++17, GStreamer `appsrc`/parser/`splitmuxsink`, SQLite3(optional),
append-only JSONL, 기존 내장 HTTP/WebRTC 서버, vanilla JavaScript Ops UI, shell/Node/C++
verifier.

**설계 명세:**
[v4.1.0 녹화 기반과 v4.x 검색 확장 설계](../specs/2026-09-02-v410-recording-search-foundation-design.md)

## 전역 제약

- 이 문서는 구현계획이며 구현·테스트 실행·커밋·푸시·PR·머지·태그·릴리즈 승인이 아니다.
- 실제 개발은 `V410-S00`부터 순서대로 진행한다. 한 단계가 실패하면 뒤 단계는 실행하지
  않고 `건너뜀`으로 보고한다.
- 각 단계의 focused test는 [AGENTS.md 3.1.1](../../../AGENTS.md#311-tdd의-예상된-red와-실제-실패-구분)의
  예상된 RED 조건을 확인한 뒤 해당 단계 범위만 구현하고 다시 통과시킨다.
- 커밋은 사용자의 최신 지시에 `커밋` 승인이 명시된 단계에서만 수행한다. 아래 커밋
  명령은 승인 후 실행할 명령이지 자동 승인 문구가 아니다.
- 안정화, UI 풀테스트, 30분, 120분 검증은 AGENTS.md의 필요성 판정과 사용자 실행 승인을
  별도로 받는다.
- v4.1.0에서는 구조화 검색, 임베딩, 자연어 해석, 교차 카메라 Entity 추론을 구현하지
  않는다.
- MyLocalLLM, VARuleLens와 공유 GPT 대화는 참고 자료로만 남긴다. 원본 저장소 수정,
  submodule, runtime dependency, 코드 복사는 금지한다.
- 모든 새 문서와 사용자 표출 문구는 한글을 기본으로 한다. API 필드, 소스 식별자,
  표준 고유명사만 원문을 유지한다.
- 기존 RTSP/WebRTC media packet, EventRecord, Event POST schema의 기존 필드 의미를
  바꾸지 않는다. 필요한 값은 additive field 또는 별도 녹화 contract로 추가한다.
- Apache-2.0과 충돌하거나 권리 상태가 불명확한 구현은 사용하지 않는다. 특허 위험이
  있거나 불확실한 접근은 구현 상세를 설계에 반입하지 않고 기능을 재설계·축소·보류한다.

---

## 구현 전 고정 계약

### 식별자와 시간

- v4.1.0의 등록 채널 식별자는 `SourceViewRegistry::SourceRecord::source_id`를 그대로
  `channel_id`로 사용한다. `source_id`와 `channel_id`를 같은 값으로 저장하되 두 필드는
  후속 다중 채널 source 확장을 위해 계속 분리한다.
- `stream_epoch_id`는 source worker가 새로 시작되거나 PTS가 뒤로 이동·큰 폭으로
  불연속할 때 새로 발급한다.
- 현재 `media::Packet::pts`는 nanosecond로 취급한다. 영속 계약에는
  `time_base_num=1`, `time_base_den=1000000000`, `pts`를 함께 저장한다.
- epoch 첫 video keyframe의 `{pts, observed_utc_ms}`를 anchor로 잡고
  `utc_ms = anchor_utc_ms + (pts - anchor_pts) / 1,000,000`으로 매핑한다.
- system clock 역행 또는 PTS rollback을 발견하면 기존 epoch의 마지막 segment를 닫고 새
  epoch를 시작한다. 이미 finalize된 UTC 범위를 다시 쓰지 않는다.
- 모든 시간 범위는 `[start_utc_ms, end_utc_ms)` 반개구간이다.

### 설정 계약

전역 환경변수는 다음 이름과 기본값으로 고정한다. 전역과 채널 모두 enabled여야 실제
녹화가 시작된다.

| 환경변수 | 기본값 | 의미 |
| --- | --- | --- |
| `MEDIA_SERVER_RECORDING_ENABLED` | `0` | 녹화 subsystem 전역 opt-in |
| `MEDIA_SERVER_RECORDING_STORAGE_ROOT` | `.media_server/recordings` | S01~S05 실제 구현의 영상·journal·catalog root. 운영 계약은 config-reference.md를 따름 |
| `MEDIA_SERVER_RECORDING_SEGMENT_DURATION_SECONDS` | `10` | S01~S05 실제 구현의 목표 segment 길이(초). 실제 분할은 다음 keyframe까지 연장 가능 |
| `MEDIA_SERVER_RECORDING_RESERVED_FREE_BYTES` | `1073741824` | 쓰기 전에 남겨야 하는 store 여유 공간 |
| `MEDIA_SERVER_RECORDING_OBSERVATION_INTERVAL_MS` | `1000` | 대표 중간 관측 기본 간격 |
| `MEDIA_SERVER_RECORDING_RETENTION_INTERVAL_MS` | `5000` | quota·기간·reserve 정리 주기 |

`SourceRecord`에는 다음 additive nested object를 저장한다.

```json
{
  "recording": {
    "enabled": false,
    "continuousMaxBytes": 0,
    "continuousMaxAgeMs": 0,
    "eventMaxBytes": 0,
    "eventMaxAgeMs": 0,
    "observationIntervalMs": 1000
  }
}
```

- `enabled=false`이면 나머지 값은 보존하지만 recorder를 시작하지 않는다.
- `enabled=true`이면 `continuousMaxBytes > 0`, `eventMaxBytes > 0`을 필수로 한다.
- `*MaxAgeMs=0`은 기간 제한 없음이며, 음수는 거부한다.
- quota는 channel별·retention class별로 적용하고 전역 reserved free space는 store 전체에
  적용한다.
- root가 symlink traversal, 파일 경로 중복, 쓰기 불가 상태이면 해당 channel 시작을
  fail-closed한다. live/VA 경로는 계속 동작한다.

### 미디어 형식

- H.264/H.265 video는 MP4 segment를 사용한다. MP4에 안전하게 mux할 수 없는 audio는
  video 녹화를 막지 않고 `audio_omitted_reason`을 기록한다.
- VP8 video는 WebM segment를 사용하며 Opus audio를 허용한다.
- 지원하지 않는 video codec은 `unsupported-codec` channel 상태로 표출하고 정상 segment로
  가장하지 않는다.
- 목표 10초가 되어도 keyframe이 없으면 현재 GOP가 끝날 때 분할한다. 실제 길이가 목표의
  3배를 넘으면 `long-gop` warning을 남기지만 손상된 임의 byte split은 하지 않는다.
- 최종 파일명은 `{segment_id}.mp4` 또는 `{segment_id}.webm`이다. writer는
  `<root>/.pending/{segment_id}.partial`만 쓰고 close/fsync 뒤 channel 날짜 경로로 rename한다.

### 영속 저장 순서

segment finalize 순서는 다음으로 고정한다.

```text
partial media close/fsync
  -> final media atomic rename
  -> segment_finalized JSONL append/fsync
  -> SQLite transaction projection
  -> read service 공개
```

삭제 순서는 다음으로 고정한다.

```text
deletion_requested JSONL append/fsync
  -> SQLite deletion_pending
  -> media unlink
  -> deletion_completed/tombstone JSONL append/fsync
  -> SQLite deleted/tombstone
```

journal append가 실패하면 파괴적 transition을 진행하지 않는다. media rename 뒤 journal
전 기록에 crash가 발생한 orphan은 시작 복구 scan이 checksum과 container 검사를 통과한
경우에만 `recovered_segment_finalized`로 다시 연결한다.

### API와 우선순위

- `GET /ops/api/recordings/status`
- `GET /ops/api/recordings/timeline?channelId=&startTimeMs=&endTimeMs=&offset=&limit=`
- `GET /ops/api/recordings/media/{segmentId}` (`Range`/`HEAD` 지원)

timeline은 `startTimeMs DESC`, `displayPriority DESC`, `segmentId ASC`로 안정 정렬한다.
`event=200`, `continuous=100`으로 고정하고, 겹치는 continuous 항목에는
`supersededByEventIds`를 채운다. UI는 event 항목을 기본 펼침·재생 대상으로 사용하고
continuous 항목은 원본/대체 항목으로 접는다. media URL은 catalog ID만 받으며 filesystem
path를 응답에 노출하지 않는다.

---

## Task 0: V410-S00 표준·오픈소스·IP 게이트와 source baseline 정렬

**수정 파일:**

- 수정: `VERSION`
- 수정: `CMakeLists.txt`
- 수정: `README.md`
- 수정: `README.en.md`
- 수정: `docs/README.md`
- 수정: `docs/en/README.md`
- 수정: `docs/development-backlog.md`
- 수정: `docs/v410-v49-recording-search-roadmap.md`
- 수정: `docs/versioning-policy.md`
- 수정: `docs/release-policy.md`
- 수정: `docs/public-repo-final-review.md`
- 수정: `docs/ui-guide.md`
- 수정: `docs/assets/ui/README.md`
- 수정: `config/docs_ui_assets.json`
- 수정: `scripts/internal/verify_docs_ui_assets.mjs`
- 수정: `scripts/internal/verify_release_metadata_consistency.mjs`
- 수정: `docs/superpowers/specs/2026-09-02-v410-recording-search-foundation-design.md`
- 수정: `docs/superpowers/plans/2026-09-02-v410-recording-foundation-implementation-plan.md`
- 생성: `docs/research/v410-recording-storage-open-source-review.md`
- 생성: `docs/research/v410-recording-ip-risk-gate.md`
- 생성: `docs/release-evidence-v410.md`
- 생성: `scripts/internal/verify_v410_research_gate.sh`
- 생성: `scripts/internal/verify_v410_entry_baseline.sh`
- 수정: `server.sh`

### Step 1: 실패하는 문서 게이트를 먼저 작성한다

`verify_v410_research_gate.sh`는 다음 필드를 요구한다.

- 검토 자료별 URL, 고정 revision 또는 문서 버전, 확인일, license, 허용된 참고 범위
- `codeCopied=false`, `runtimeDependency=false`, `submodule=false`
- 표준과 공개 동작에서 채택한 의미, 채택하지 않은 기능
- 특허 위험 게이트의 접근 ID별 `허용/재설계/보류` 결정
- 위험 또는 불확실 판정 접근에는 특허 번호·청구항·구현 상세를 제품 설계 문서에 복제하지
  않았다는 clean-room 확인
- 이 기록이 법률 의견이나 FTO를 대체하지 않는다는 경계

먼저 실행해 필요한 문서가 없어서 실패하는 것을 확인한다.

```bash
./server.sh verify-v410-research-gate
```

예상: non-zero, `v4.1 recording research gate document missing`.

### Step 2: 안전한 조사 문서를 작성한다

공식 GStreamer, ONVIF Profile G/M/Analytics 문서와 license가 확인된 permissive 공개 구현만
검토한다. MyLocalLLM/VARuleLens는 원본 revision과 license 상태만 기록하고 코드를 가져오지
않는다. license가 없거나 불명확하면 `구현 참고 제외`로 판정한다.

특허 위험 검토는 제품 구현자가 특허 상세를 설계 입력으로 쓰지 않도록 별도 판정 결과만
받는다. `재설계/보류` 항목은 기능명과 결정만 남기고 해당 구현 상세 링크를 설계 문서에
추가하지 않는다.

### Step 3: source target을 4.1.0으로 맞춘다

- `VERSION`과 `project(... VERSION ...)`은 `4.1.0`으로 변경한다.
- current source target은 `v4.1.0`, latest published baseline은 `v4.0.0`으로 구분한다.
- 장기 로드맵과 세부 설계의 상태를 `사용자 승인 완료, 구현 미착수`로 바꾼다.
- `verify-v410-entry-baseline`은 branch, source version, current roadmap, latest published
  baseline의 서로 다른 의미를 검사한다.

### Step 4: focused 검증과 문서 검증을 실행한다

```bash
./server.sh verify-v410-research-gate
./server.sh verify-v410-entry-baseline
./server.sh verify-release-metadata
./server.sh verify-docs-ui-assets
./server.sh verify-docs-links
./server.sh verify-script-inventory
git diff --check
```

### Step 5: evidence와 커밋 경계를 기록한다

`docs/release-evidence-v410.md`에 `V410-S00`의 구현 위치, 실행 명령, 결과, 미실행 테스트를
기록한다.

사용자가 이 단계 커밋을 명시 승인한 경우에만:

```bash
git add VERSION CMakeLists.txt README.md README.en.md config/docs_ui_assets.json docs/README.md docs/en/README.md docs/development-backlog.md docs/v410-v49-recording-search-roadmap.md docs/versioning-policy.md docs/release-policy.md docs/public-repo-final-review.md docs/ui-guide.md docs/assets/ui/README.md docs/research/v410-recording-storage-open-source-review.md docs/research/v410-recording-ip-risk-gate.md docs/release-evidence-v410.md docs/superpowers/specs/2026-09-02-v410-recording-search-foundation-design.md scripts/internal/verify_v410_research_gate.sh scripts/internal/verify_v410_entry_baseline.sh scripts/internal/verify_docs_ui_assets.mjs scripts/internal/verify_release_metadata_consistency.mjs server.sh
git commit -m "docs: v4.1.0 녹화 연구 게이트 고정"
```

---

S01~S05의 verifier와 `server.sh` dispatch는 구현되어 실제 명령으로 승격됐다. S06~S09의
`planned-command`는 해당 단계에서 verifier와 dispatch를 함께 구현한 뒤 실행 명령으로
승격할 계획 ID이며 현재 실행 가능한 명령이나 PASS 증거가 아니다.

## Task 1: V410-S01 녹화 v1 계약과 golden fixture

**수정 파일:**

- 생성: `include/recording/recording_contracts.h`
- 생성: `src/recording/recording_contracts.cpp`
- 생성: `include/recording/recording_store_port.h`
- 생성: `test/fixtures/recording/v1/segments.jsonl`
- 생성: `test/fixtures/recording/v1/event-links.jsonl`
- 생성: `test/fixtures/recording/v1/observations.jsonl`
- 생성: `test/fixtures/recording/v1/tombstones.jsonl`
- 생성: `scripts/internal/recording_contract_smoke.cpp`
- 생성: `scripts/internal/verify_v410_recording_contracts.sh`
- 수정: `CMakeLists.txt`
- 수정: `server.sh`
- 수정: `docs/release-evidence-v410.md`

### Step 1: RED 계약 test를 작성한다

smoke는 다음을 먼저 요구하고 구현 전 compile 또는 assertion 실패를 확인한다.

- 모든 opaque ID가 빈 값·path·SQLite rowid가 아님
- UTC 반개구간과 PTS/timebase round-trip
- unknown optional field가 있는 v1 JSON을 읽고 known field를 보존
- lifecycle enum의 알 수 없는 값은 playable로 승격되지 않음
- fixture serialize → parse → serialize semantic parity
- tombstone ID 재사용 거부

```bash
./server.sh verify-v410-recording-contracts
```

### Step 2: exact C++ 계약을 구현한다

`recording_contracts.h`의 public type은 다음 경계를 가진다.

```cpp
namespace recording {
enum class RecordingRetentionClass { Continuous, Event };
enum class RecordingLifecycle { Writing, Finalized, DeletionPending, Deleted, Corrupt };

struct MediaTimeV1 {
    std::int64_t utc_ms{0};
    std::int64_t pts{0};
    std::int32_t time_base_num{1};
    std::int32_t time_base_den{1000000000};
};

struct RecordingSegmentV1 {
    std::string schema{"media-server.recording-segment.v1"};
    std::string segment_id;
    std::string source_id;
    std::string channel_id;
    std::string stream_epoch_id;
    MediaTimeV1 start;
    MediaTimeV1 end;
    std::string container;
    std::vector<std::string> video_codecs;
    std::vector<std::string> audio_codecs;
    std::string audio_omitted_reason;
    std::uint64_t size_bytes{0};
    std::string checksum_sha256;
    RecordingRetentionClass retention_class{RecordingRetentionClass::Continuous};
    RecordingLifecycle lifecycle{RecordingLifecycle::Writing};
    bool pinned{false};
    std::int64_t created_at_ms{0};
    std::int64_t finalized_at_ms{0};
};

struct FrameLocatorV1 {
    std::string schema{"media-server.frame-locator.v1"};
    std::string segment_id;
    MediaTimeV1 frame;
    std::optional<std::uint64_t> frame_index;
    std::optional<std::int64_t> keyframe_pts;
};

struct EventRecordingLinkV1;
struct AnalysisObservationV1;
struct RecordingTombstoneV1;
}
```

`EventRecordingLinkV1`은 requested range, ordered overlap, derived segment, fallback evidence,
missing ranges, `complete/partial/failed/pending` 상태를 가진다. `AnalysisObservationV1`은
track/class/confidence/normalized bbox/zone/line/rule/scenario/event와 `selection_reason`을
가진다. `RecordingTombstoneV1`은 삭제 전 source/channel/range/checksum과 삭제 사유를
가진다.

### Step 3: 저장 port를 고정한다

```cpp
class RecordingStorePort {
public:
    virtual ~RecordingStorePort() = default;
    virtual bool FinalizeSegment(const RecordingSegmentV1&, const std::string& media_path,
                                 std::string* error) = 0;
    virtual bool PutEventLink(const EventRecordingLinkV1&, std::string* error) = 0;
    virtual bool PutObservation(const AnalysisObservationV1&, std::string* error) = 0;
    virtual bool RequestDeletion(const std::string& segment_id, const std::string& reason,
                                 std::string* error) = 0;
    virtual bool CompleteDeletion(const RecordingTombstoneV1&, std::string* error) = 0;
    virtual std::vector<RecordingSegmentV1> QuerySegments(
        const std::string& channel_id, std::int64_t start_ms, std::int64_t end_ms) const = 0;
};
```

filesystem path는 internal port 인자로만 사용하고 JSON serializer에 넣지 않는다.

### Step 4: GREEN과 문서 기록

```bash
./server.sh verify-v410-recording-contracts
./server.sh verify-docs-links
git diff --check
```

evidence에는 각 type의 파일/serializer/parser/test fixture를 연결한다. 승인 시에만:

```bash
git add include/recording/recording_contracts.h include/recording/recording_store_port.h src/recording/recording_contracts.cpp test/fixtures/recording/v1 scripts/internal/recording_contract_smoke.cpp scripts/internal/verify_v410_recording_contracts.sh CMakeLists.txt server.sh docs/release-evidence-v410.md
git commit -m "feat: v4.1 녹화 영속 계약 추가"
```

---

## Task 2: V410-S02 채널 정책, Recorder subscriber와 segment writer

**수정 파일:**

- 생성: `include/core/recording_runtime_defaults.h`
- 생성: `include/core/recording_runtime_config_data.h`
- 수정: `include/app_config.h`
- 수정: `src/app_config.cpp`
- 수정: `include/ingress/source_view_registry.h`
- 수정: `src/ingress/source_view_registry.cpp`
- 수정: `include/ingress/source_view_application_service.h`
- 수정: `src/ingress/source_view_application_service.cpp`
- 수정: `src/ingress/product_ui_ops_sources_script.cpp`
- 수정: `include/core/shared_stream.h`
- 수정: `src/core/shared_stream.cpp`
- 수정: `include/core/session_manager.h`
- 수정: `src/core/session_manager.cpp`
- 생성: `include/recording/segment_writer.h`
- 생성: `include/recording/gstreamer_segment_writer.h`
- 생성: `src/recording/gstreamer_segment_writer.cpp`
- 생성: `include/recording/recording_session_service.h`
- 생성: `src/recording/recording_session_service.cpp`
- 생성: `scripts/internal/recording_segment_writer_smoke.cpp`
- 생성: `scripts/internal/verify_v410_recording_recorder.sh`
- 수정: `CMakeLists.txt`
- 수정: `server.sh`
- 수정: `docs/config-reference.md`
- 수정: `docs/release-evidence-v410.md`

### Step 1: RED 설정·segment test를 작성한다

fixture packet으로 다음을 실패시키는 test부터 만든다.

- global 또는 channel disabled이면 파일·subscriber 생성 0
- enabled인데 quota 0, root 중복/쓰기 불가이면 validation 실패
- H.264 keyframe 두 개 사이에서 MP4 한 개 finalize
- VP8 keyframe 두 개 사이에서 WebM 한 개 finalize
- delta frame으로 시작하지 않고 cached GOP의 첫 keyframe부터 기록
- 10초 도달 뒤 다음 keyframe에서만 분할
- source PTS rollback 시 새 `stream_epoch_id`
- subscriber queue overflow가 live client queue를 막지 않음
- final callback 전 `.partial`, callback 뒤 final path만 존재

```bash
planned-command verify-v410-recording-recorder
```

### Step 2: Recorder role을 additive하게 추가한다

`SharedStream::SubscriberRole`에 `Recorder`를 추가하고 다음 API를 만든다.

```cpp
bool AddRecordingSubscriber(const std::string& subscriber_id, SubscriberCallback callback);
std::size_t RecordingSubscriberCount() const;
```

`RefCount()`는 계속 client만, `AnalysisSubscriberCount()`는 analysis만 센다.
`TotalSubscriberCount()`는 recorder까지 포함해 녹화 중 source가 idle cleanup되지 않게 한다.
runtime debug label은 `client/analysis/recorder` 세 값을 정확히 구분한다.

`SessionManager::SourceEgressStats`와 runtime snapshot에는
`recording_subscriber_count`, `active_recording_channels`를 additive field로 추가한다.

### Step 3: source registry 녹화 정책을 구현한다

`SourceRecord`와 application DTO에 `RecordingPolicy` nested struct를 추가한다. create/upsert,
save/load, snapshot, Ops sources form이 같은 값을 round-trip해야 한다. viewer-safe client view
응답에는 quota와 storage path를 노출하지 않는다.

source가 disabled되면 recording policy가 enabled여도 recorder를 시작하지 않는다.
policy mutation은 저장 성공 뒤 Task 3에서 연결할 supervisor reconcile을 요청할 수 있도록
callback port를 둔다. 저장 실패 시 runtime reconcile을 호출하지 않는다.

### Step 4: writer와 session service를 구현한다

`SegmentWriter`는 GStreamer 세부를 숨긴다.

```cpp
class SegmentWriter {
public:
    using FinalizedCallback = std::function<void(RecordingSegmentV1, std::string media_path)>;
    virtual ~SegmentWriter() = default;
    virtual bool Start(const std::string& channel_id,
                       const std::string& stream_epoch_id,
                       const media::StreamDescriptor& descriptor,
                       FinalizedCallback on_finalized,
                       std::string* error) = 0;
    virtual void Push(const media::Packet& packet, std::int64_t observed_utc_ms) = 0;
    virtual void Stop() = 0;
};
```

`RecordingSessionService`는 `AnalysisSessionService`와 같은
`AcquireAuxiliaryStream → AddRecordingSubscriber → StartAuxiliaryStream` 순서를 쓴다.
채널당 subscriber 한 개만 허용하고 detach 시 subscriber 제거 후
`ReleaseAuxiliaryStreamWhenIdle`을 정확히 한 번 호출한다.

writer는 descriptor가 준비되고 첫 video keyframe이 들어올 때 시작한다. codec 조합별
parser와 muxer 선택은 전역의 미디어 형식 표를 따른다. writer callback은 Task 1의
`RecordingStorePort` fake로 test하고 production wiring은 Task 3에서 연결한다.

### Step 5: focused 검증과 문서 기록

```bash
planned-command verify-v410-recording-recorder
./server.sh verify-v410-recording-contracts
./server.sh verify-docs-links
git diff --check
```

승인 시에만 이 단계 파일을 stage하고 다음 메시지로 커밋한다.

```bash
git commit -m "feat: 채널별 상시녹화 segment writer 추가"
```

---

## Task 3: V410-S03 JSONL 원장, SQLite projection과 supervisor wiring

**수정 파일:**

- 생성: `include/recording/recording_journal.h`
- 생성: `src/recording/recording_journal.cpp`
- 생성: `include/recording/recording_catalog.h`
- 생성: `src/recording/recording_catalog.cpp`
- 생성: `include/recording/recording_supervisor.h`
- 생성: `src/recording/recording_supervisor.cpp`
- 수정: `src/application/media_server_application.cpp`
- 생성: `scripts/internal/recording_catalog_smoke.cpp`
- 생성: `scripts/internal/verify_v410_recording_catalog.sh`
- 수정: `CMakeLists.txt`
- 수정: `server.sh`
- 수정: `docs/release-evidence-v410.md`

### Step 1: RED journal/catalog test를 작성한다

- 같은 mutation을 두 번 replay해도 row와 합계가 증가하지 않음
- truncated 마지막 JSONL line은 skip하고 앞의 durable mutation은 보존
- 중간 corrupt line은 오류 count를 남기며 정상 line projection은 계속
- SQLite on/off가 같은 range query ID·순서·상태를 반환
- foreign key 위반 event link는 transaction 전체 rollback
- final media는 있지만 journal이 없는 orphan을 정상/손상으로 구분
- SQLite 파일 손상 시 원본을 덮어쓰지 않고 격리한 뒤 journal rebuild

```bash
planned-command verify-v410-recording-catalog
```

### Step 2: append-only mutation envelope를 구현한다

```json
{
  "schema": "media-server.recording-mutation.v1",
  "mutationId": "opaque-id",
  "mutationType": "segment_finalized",
  "occurredAtMs": 0,
  "entityId": "segment-id",
  "payload": {}
}
```

지원 mutation은 `segment_finalized`, `event_link_created`, `observation_put`,
`deletion_requested`, `deletion_completed`, `corruption_detected`다. `mutation_id` unique로
idempotency를 보장한다. append는 process mutex 아래 한 줄 write + flush + fsync로 닫는다.

### Step 3: SQLite schema와 fallback projection을 구현한다

schema version 1의 table은 다음으로 고정한다.

- `recording_meta(key PRIMARY KEY, value)`
- `recording_mutations(mutation_id PRIMARY KEY, type, occurred_at_ms, entity_id)`
- `recording_segments(segment_id PRIMARY KEY, source_id, channel_id, stream_epoch_id,
  start_utc_ms, end_utc_ms, start_pts, end_pts, time_base_num, time_base_den, container,
  codecs_json, size_bytes, checksum_sha256, retention_class, lifecycle, pinned,
  hold_count, media_relpath, created_at_ms, finalized_at_ms)`
- `recording_event_links(link_id PRIMARY KEY, event_id UNIQUE, channel_id,
  requested_start_ms, requested_end_ms, derived_segment_id, fallback_ref, completeness,
  missing_ranges_json, display_priority)`
- `recording_event_link_segments(link_id, segment_id, overlap_start_ms, overlap_end_ms,
  PRIMARY KEY(link_id, segment_id))`
- `recording_observations(observation_id PRIMARY KEY, channel_id, segment_id, utc_ms, pts,
  track_id, class_id, class_name, confidence, bbox_json, event_id, selection_reason,
  payload_json)`
- `recording_tombstones(entity_id PRIMARY KEY, entity_kind, channel_id, start_utc_ms,
  end_utc_ms, deleted_at_ms, reason, retention_class, checksum_sha256)`

필수 index는 segment channel/range, retention class/end time, observation
channel/time/track, event_id다. SQLite는 WAL과 foreign key를 켠다. compile-time SQLite가
없으면 in-memory projection을 journal replay로 만들고 `catalogMode=jsonl-fallback`을
status에 표출한다.

### Step 4: supervisor를 production에 연결한다

composition root 순서는 다음으로 고정한다.

```text
RecordingJournal open/recover
  -> RecordingCatalog rebuild/open
  -> RecordingSessionService 생성
  -> SourceView snapshot으로 RecordingSupervisor::Start
  -> HTTP/RTSP server Start
```

종료는 HTTP/RTSP ingress를 먼저 닫고 supervisor가 writer를 finalize한 뒤 catalog/journal을
닫는다. `StopEventStorage()`는 녹화 bridge가 해제된 다음 호출한다.

supervisor는 시작 시 enabled source를 reconcile하고, source registry 저장 callback과 5초
safety reconcile에서 추가/변경/disabled channel을 반영한다. 같은 policy revision의 중복
reconcile은 subscriber를 재생성하지 않는다.

### Step 5: GREEN과 parity evidence

```bash
planned-command verify-v410-recording-catalog
planned-command verify-v410-recording-recorder
git diff --check
```

evidence에 SQLite 사용/미사용 두 결과를 별도 기록한다. 승인 시에만:

```bash
git commit -m "feat: 녹화 journal과 SQLite catalog 연결"
```

---

## Task 4: V410-S04 보존 등급, 순환 삭제와 disk reserve

**수정 파일:**

- 생성: `include/recording/retention_coordinator.h`
- 생성: `src/recording/retention_coordinator.cpp`
- 수정: `include/recording/recording_catalog.h`
- 수정: `src/recording/recording_catalog.cpp`
- 수정: `include/recording/recording_supervisor.h`
- 수정: `src/recording/recording_supervisor.cpp`
- 생성: `scripts/internal/recording_retention_smoke.cpp`
- 생성: `scripts/internal/verify_v410_recording_retention.sh`
- 수정: `CMakeLists.txt`
- 수정: `server.sh`
- 수정: `docs/config-reference.md`
- 수정: `docs/release-evidence-v410.md`

### Step 1: RED 보존 test를 작성한다

- continuous quota 초과 시 `end_utc_ms, segment_id`가 가장 작은 항목부터 삭제
- event quota와 continuous quota가 서로의 artifact를 삭제하지 않음
- pinned event와 `hold_count>0` continuous는 자동 삭제 대상 아님
- unlink 실패 시 `deletion_pending` 유지, 회수 byte 0
- journal 실패 시 media unlink 미호출
- reserved free space가 부족하면 eligible continuous를 먼저 정리
- 더 지울 수 없으면 해당 channel만 `storage-blocked`, live/analysis 정상
- 공간이 회복되면 새 keyframe부터 자동 재개하고 epoch를 새로 발급
- tombstone은 남고 media path와 원본 bytes는 남지 않음
- 새 segment 예상 용량까지 continuous quota에 반영
- 채널 간 in-flight reserve 중복 승인 차단과 finalize/실패 반환
- tombstone 기록 실패 pending을 다음 tick에서 idempotent 재시도
- replay와 unlink 직전 storage-root canonical containment 검사
- 명시한 음수·비정상 quota/기간 입력 거부
- 검사와 unlink 사이 상위 디렉터리 교체를 dirfd 결박으로 방어
- 한 채널의 pending 실패가 다른 채널 admission과 주기 cleanup을 막지 않음
- partial 실제 쓰기량과 in-flight 예약을 중복 차감하지 않음
- event quota 초과와 continuous writer admission을 독립 판정
- SQLite 실시간 projection 실패 시 JSONL fallback과 재시작 rebuild

```bash
./server.sh verify-v410-recording-retention
```

### Step 2: 순수 selection과 side effect 실행을 분리한다

`RetentionCoordinator::Plan()`은 catalog snapshot과 filesystem space를 입력받아 삭제 ID와
사유만 반환하는 순수 단계로 만든다. `Apply()`가 journal → state → unlink → tombstone을
수행한다. test는 selection 순서와 side effect failure를 각각 주입한다.

cleanup 사유는 `continuous-capacity`, `continuous-age`, `event-capacity`, `event-age`,
`reserved-free-space`, `manual-corrupt-cleanup`으로 제한한다. continuous quota 정리에서
event artifact를 선택하는 코드는 허용하지 않는다.

### Step 3: writer admission과 주기 cleanup을 연결한다

새 segment를 열기 전 예상 최대 한 segment와 reserved bytes를 확인한다. 공간 부족이면
즉시 retention을 한 번 실행한다. 복구하지 못하면 현재 channel writer만 멈추고 status에
필요 byte, 현재 free byte, eligible count, 마지막 오류를 남긴다.

예상 segment byte는 continuous quota 선택에도 포함한다. admission은 채널 전체의
in-flight reserve를 하나의 lock 안에서 검사·등록하고 writer가 partial/final 실제 크기를
보고하며 finalize하거나 open/finalize에 실패하면 실제 byte 또는 0으로 반환한다.
container overhead를 포함한 예약 상한을 넘기기 전 segment를 닫고 다음 keyframe에서
새 epoch로 재개한다. EOS 뒤 실제 파일이 예약보다 크면 finalize하지 않고 제거하며 실제
크기를 다음 admission high-water로 반영한다. catalog journal/finalize 실패도 final 파일을
삭제하거나 0 byte로 만들고, 둘 다 실패하면 예약을 반환하지 않는다. final media를 열기
전 storage root dirfd의 `openat(O_NOFOLLOW|O_EXCL)`로 cleanup-pending 마커를 만들고 file과
parent directory까지 fsync한다. catalog 성공 또는 cleanup 뒤 마커 안전 제거와 directory
fsync까지 성공해야 예약을 반환한다. 재시작 catalog는 추적 media를 보존하고 미추적
partial과 마커만 안전하게 정리한다. 소유권을 증명할 수 없는 final은 삭제하지 않고 orphan
진단에 남기며, 안전하게 정리할 수 없으면 open을 fail-closed한다. journal을 남긴 뒤 실제 삭제는 recording root에서 연 dirfd를
하위 디렉터리마다 `O_NOFOLLOW`로 결박한 뒤 `unlinkat`으로 수행한다.

### Step 4: GREEN과 문서 기록

```bash
./server.sh verify-v410-recording-retention
./server.sh verify-v410-recording-catalog
git diff --check
```

승인 시에만:

```bash
git commit -m "feat: 녹화 순환 보존과 용량 보호 추가"
```

---

## Task 5: V410-S05 이벤트 segment 연결, 파생 clip과 frame-buffer fallback

### 승인된 잔여 통합 검증 실행 결과 (2026-09-04)

선행 구현을 `d7ee14a1`로 먼저 커밋했다. 제품 코드 추가 변경 없이 실제 저장 큐의
JSONL 비활성/활성·queue=2에서 퇴출·5개 내구 PTS 연결 보존을 검증했다.
별도 프로세스에서 새 SQLite를 journal로 재구축하고 후행 H264 source로 5개씩 실제
파생·재접수 멱등성을 확인했다. `event_storage_recording_runtime_smoke.cpp`와
`verify_v410_event_storage_recording_runtime.mjs`를 기존 S05 명령에 필수 연결하고,
I02에 20개 check를 선등록했다. 기존 고정 action ID 27개를 유지한다.
실제 runtime 20/0·mutation 2/0, C++ 140/0·application 7/0·등록기 단위 26/0·
action 27/0(check 89개). mutation 로그 소비자 보강의 TDD RED/수정 이력 및 최종 결과는
[테스트 기록](../../release-test-records.md)에 남긴다. S06 이후는 착수하지 않는다.

### 중단 재개 보정 계획 (2026-09-04)

1. 개별 테스트 등록을 S08로 미룬 위반을 FAIL 이력으로 보존하고 완료 표기를 보류한다.
2. S05 고정 ID 27개와 네 테스트 영역·UI 부재·입력/판정/check 연결을 실행 전에 등록한다.
3. 등록기 negative 테스트 뒤 실제 assertion별 출력과 중앙 inventory 필수 연결을 구현한다.
4. S05·S01~S04·빌드·문서 검증을 재실행하고 개별 결과를 release-test-records에 기록한다.
5. 기존 canonical 986개 trust 변화는 독립 검토 후 공식 producer로만 재결속한다.
6. S06은 착수하지 않는다. 최신 명시 승인 없이 커밋·푸시·release action을 수행하지 않는다.

**수정 파일:**

- 수정: `include/analysis/event_storage.h`
- 수정: `src/analysis/event_storage.cpp`
- 생성: `include/recording/event_recording_bridge.h`
- 생성: `src/recording/event_recording_bridge.cpp`
- 생성: `include/recording/event_clip_deriver.h`
- 생성: `src/recording/event_clip_deriver.cpp`
- 수정: `src/application/media_server_application.cpp`
- 생성: `scripts/internal/event_recording_link_smoke.cpp`
- 생성: `scripts/internal/verify_v410_event_recording.sh`
- 수정: `CMakeLists.txt`
- 수정: `server.sh`
- 수정: `docs/release-evidence-v410.md`

### Step 1: RED 이벤트 연동 test를 작성한다

- event pre/event/post가 3개 continuous segment에 걸치면 overlap이 시간순 3개
- 경계가 정확히 맞닿기만 한 segment는 반개구간 overlap에 포함하지 않음
- derived clip 생성 동안 overlap segment `hold_count` 증가, 완료/실패 뒤 감소
- compatible codec은 remux하고 video 재인코딩하지 않음
- continuous gap이 있으면 기존 frame-buffer clip path를 fallback으로 기록
- 일부만 확보한 경우 `partial`과 missing range를 반환하고 `complete`로 표시하지 않음
- 같은 event update 재수신은 같은 link를 갱신하며 파생 clip을 중복 생성하지 않음
- event quota가 가득 차면 continuous를 지우지 않고 event policy에 따라 oldest eligible
  event만 처리

```bash
./server.sh verify-v410-event-recording
```

### Step 2: EventStorage에 narrow bridge를 추가한다

`event_storage.cpp`가 녹화 catalog 구현을 직접 include하지 않게 다음 port만 선언한다.

```cpp
struct EventRecordingBridgeResult {
    bool handled{false};
    bool derived_clip_ready{false};
    std::string clip_path;
    std::string link_id;
    std::string completeness;
    std::string error;
};

class EventRecordingBridge {
public:
    virtual ~EventRecordingBridge() = default;
    virtual EventRecordingBridgeResult TryResolve(
        const AnalysisResult&, const EventRecord&, const EventMediaHookOptions&) = 0;
    virtual void RecordFallback(const EventRecord&, const EventRecordingBridgeResult&) = 0;
};
```

process-lifetime bridge는 application composition root가 등록·해제한다. `ApplyMediaHooks`는
derived clip이 ready면 기존 FileEventClipHook을 생략한다. not-handled/partial/failure이면
기존 bounded frame-buffer hook을 실행한 뒤 `RecordFallback`으로 최종 link를 갱신한다.
EventRecord JSON 기존 필드는 유지하고 `recordingLinkId`, `recordingCompleteness`를 optional로
추가한다.

### Step 3: PTS event 시간을 UTC로 매핑한다

internal event의 기존 `start_time_ms/update_time_ms/end_time_ms`가 media PTS millisecond인
경우 명시 anchor의 delta로 UTC를 계산한다. anchor가 없으면 media PTS 범위를 별도 보존하고
같은 epoch의 finalized segment가 가진 실제 PTS/UTC mapping으로만 승격한다. 외부 dispatch에는
additive `timeBasis`를 추가해 `utc-ms` 또는 `media-pts-ms`를 명시하게 한다. 값이 없으면
기존 호환은 유지하되 recording link는 `time-basis-ambiguous`로 두고 임의 UTC 연결을 하지
않는다.

### Step 4: 파생 clip을 작성한다

source segment를 직접 이어 붙이지 않고 GStreamer demux/parser/MPEG-TS mux pipeline으로
요청 범위를 remux한다. 첫 seek는 앞선 keyframe까지 넓힐 수 있으므로 실제 출력 packet의
timestamp를 측정해 manifest에
`requestedStartMs`, `actualStartMs`, `requestedEndMs`, `actualEndMs`를 모두 기록한다.
완료된 event clip은 새 `RecordingSegmentV1`이며 retention class `Event`다.

### Step 5: GREEN과 회귀 검증

```bash
./server.sh verify-v410-event-recording
./server.sh verify-v410-recording-retention
./server.sh verify-v410-recording-catalog
git diff --check
```

승인 시에만:

```bash
git commit -m "feat: 이벤트 녹화 연결과 파생 clip 추가"
```

### 구현 결과

- `EventStorage`는 JSONL 저장 활성화 여부와 독립적으로 process-lifetime bridge가 있으면
  이벤트를 bounded worker에 전달한다. bridge는 `shared_ptr` snapshot으로 등록·해제하며
  storage worker에서 remux를 직접 실행하지 않는다.
- internal media event는 `media-pts-ms`와 UTC/PTS anchor·stream epoch를 함께 넘기고, 외부
  application DTO는 시간축이 비어 있으면 임의 UTC로 해석하지 않는다.
- keyed 비동기 worker는 같은 event update를 하나의 결정적 link/segment ID로 합치고,
  finalized continuous source lease와 Event 전용 quota reservation을 얻은 뒤 파생한다.
- GStreamer deriver는 검증된 video-only H.264/MP4 overlap을 demux/parser/MPEG-TS mux로
  연결하고 video decoder와 encoder를 사용하지 않는다. VP8/WebM event 파생은 S05에서
  fail-closed해 frame-buffer fallback으로 보낸다. source/output fd 결박, owner-only
  `.partial.<uuid>`, 이를 지목하는 durable v2 cleanup marker, inode 재검증, no-replace
  publish, fsync, SHA-256을 적용한다. catalog 재시작은 v2 marker가 지목한 단일-link
  partial만 정리하고 v1/foreign final·partial은 보존한다.
- complete link에는 source overlap, 요청/실제 범위, `remux-no-video-reencode`를 기록한다.
  gap·epoch/codec 불일치·lease 실패는 partial/failed 경계와 missing range로 남기고 기존
  frame-buffer 결과를 같은 link의 fallback evidence로 갱신한다.
- 제품 종료는 ingress 정지 → continuous writer finalize → EventStorage drain → event bridge
  drain/해제 순서다. bridge는 외부 ingress 시작 전에 등록한다. 재시작 시 pending link를 재대기시키고 이미 finalized된 결정적 event
  segment가 있으면 재파생하지 않고 link만 복구한다.
- EventRecord bounded queue가 포화되기 전에 durable link를 먼저 기록하고 keyed worker의
  pending은 후속 슬롯으로 다시 흡수한다. SHA-256 결정 ID로 긴 공통 prefix 충돌을 막고,
  complete event 범위가 넓어지면 범위 결속 ID로 새 파생물을 만든다. provisional fallback에는
  내부 media locator를 함께 남긴다.
- marker 제거와 terminal link 기록이 끝날 때까지 source/output hold와 Event reservation을
  유지한다. marker 제거 뒤 terminal resource-release pending을 먼저 기록하고 hold와
  reservation 해제가 모두 성공해야 complete로 승격한다. 실제 remux 중에는 admission lock을
  풀어 다른 event의 durable link 기록을 막지 않는다. tombstone ID 재사용은 거부하며,
  소유권을 증명할 수 없는 기존 final은 삭제하지 않고 orphan 진단에 남긴다.
- terminal 미완료 link의 source/output은 hold가 해제됐어도 catalog가 삭제 요청을 차단한다.
  복구 중 event/fallback update는 단계와 소유 자원을 보존하고 UTC 확장 요청은 additive
  `deferred_requested_range`로 journal 대기한 뒤 기존 자원 정리 후 새 파생으로 전환한다.
- anchor 없는 후속 PTS도 기존 epoch의 segment map으로 변환한다. map이 아직 없으면
  `deferred_media_pts_range_ms`로 별도 내구 대기한다. 복구할 finalized 파생물이 없는 경우
  보류 UTC/PTS 요청을 먼저 소비해 실패·부분 완료 전이가 무한 재시도에 남지 않게 한다.
- focused 결과: `verify-v410-event-recording` C++ `pass=140 fail=0`과 EventStorage
  application-only 계약 `6/0`, contracts `45/0`, retention `56/0`, recorder `71/0`, catalog
  `45/0`과 composition 정적 항목 9건, 제품 build를 확인했다. UI·장시간·release action은 이 결과에
  포함하지 않는다.

---

## Task 6: V410-S06 event 우선 timeline API, Range 재생과 Ops UI

**현재 상태(2026-09-08): S06 구현·단계 검증 완료, 잔여 6번 문서 마감.**

event 우선 읽기 서비스·권한별 상태/timeline·opaque media 해석·GET/HEAD Range·전송 gate와
Ops 필터/목록/재생 UI를 구현했다. 잔여 1~5번은 afb6c5a3, 9de62e0e, f03ec0a6,
a4a02991, 4da626e6으로 분할 커밋했다. 제품/검증 구현 위치와 개별 결과는
[실행 기록](../../release-test-records.md)의 S06 잔여 3~6번을 따른다.
1970은 검증 fixture의 epoch 시간이며 운영 녹화 시간은 변경하지 않았다.
S06 범위 직접 UI와 관련 회귀 통과는 버전 전체 UI·30분/120분 PASS가 아니다.
S07과 릴리즈 action은 이번 문서 마감 범위 밖이다.

다음 승인·RED·준비 설명은 과거 이력이며 현재 작업 상태가 아니다.

**2026-09-06 재개 승인 이력:** 사용자가 S06 구현·안정화·분할/최종 커밋·푸시와
실패 수정 후 계속 진행을 승인했다. `de84cca6ee262d76c882650c266ce8bbb56add37`의 검증 준비
체크포인트에서 기존 단일 Sol/xhigh 담당자를 재사용한다. 실제 UI 풀테스트와 30분/120분은
별도 승인 전 실행하지 않는다. 상태·timeline → 권한·opaque ID → fd/lease → Range/HEAD →
Ops UI 순서로 구현하고 기존 S01~S05 계약을 유지한다. 다음은 이전 실행 이력이다.

**이전 검증 준비:** 개별 ID 34개를 사전 등록하고
단일 Sol xhigh 담당자가 verifier 초안 2개를 작성했다. 첫 focused 실행은 서버 시작 전
loopback bind EPERM으로 실패해 예상된 RED로 인정하지 않고 중단했다. 메인은 임시 root
삭제·부재와 초안의 RED·PASS·정리 판정 보완 사항을 확인했다. 구현·회귀·UI 풀테스트는
미실행이며 커밋·푸시도 하지 않았다. 실제 명령과 실패 기록은 release-test-records의 S06 절을 따른다.
이후 사용자가 초안 보완·동일 focused 재개를 승인했다. 내부 보조 H01~H03으로 판정·정리
회귀를 등록하고 기존 단일 담당자와 재개한다. 제품 구현이나 S06 통과를 뜻하지 않는다.
재개 결과 H01~H03 3개·12검사 통과, 실제 I01 status 404에 도달했다. 그러나 port 확인
반환값 누락과 최종 성공 조건 누락으로 cleanup PASS/closed false 불일치가 발생해 중단했다.
당시 실제 PID·port·root 부재는 별도 확인했다. 이후 추가 승인으로 메인이 반환값과
미확인 증거 거부를 보완했다. H01~H03/H03-R01/R02 5개·40검사 통과, 같은 I01에서
HTTP 404 예상 RED와 정상 종료·두 포트 ECONNREFUSED·root 삭제를 확인했다.
이전 두 실패 이력은 유지한다. I27·제품 구현·제품 build·인증·관련 제품 회귀는 미실행이며
현재 보완을 S06 기능 PASS로 확대하지 않는다.

**수정 파일:**

- 생성: `include/recording/recording_read_service.h`
- 생성: `src/recording/recording_read_service.cpp`
- 생성: `include/ingress/recording_application_service.h`
- 생성: `src/ingress/recording_application_service.cpp`
- 수정: `include/ingress/webrtc_http_server.h`
- 수정: `src/ingress/webrtc_http_server.cpp`
- 수정: `src/ingress/webrtc_http_server_runtime.cpp`
- 수정: `src/ingress/webrtc_http_server_detail.h`
- 수정: `src/ingress/product_ui_server_pages.cpp`
- 수정: `src/ingress/product_ui_page_scripts.cpp`
- 수정: `src/ingress/product_ui_css.cpp`
- 수정: `src/application/media_server_application.cpp`
- 생성: `scripts/internal/recording_timeline_smoke.cpp`
- 생성: `scripts/internal/verify_v410_recording_timeline.sh`
- 생성: `scripts/internal/verify_v410_recording_ui_contract.mjs`
- 수정: `CMakeLists.txt`
- 수정: `server.sh`
- 수정: `docs/config-reference.md` (녹화 API 계약; 계획의 `docs/http-api.md`는 실제 부재)
- 수정: `docs/ui-guide.md` (기존 Ops 이벤트 직접 route의 녹화 사용 흐름)
- 수정: `docs/release-evidence-v410.md`

### Step 1: RED read/API/UI contract test를 작성한다

- 같은 범위 event/continuous가 있으면 event priority 200이 먼저
- continuous 응답에 정확한 `supersededByEventIds`
- deleted/corrupt/writing segment는 `playable=false`
- pagination cursor가 아닌 v4.1 offset/limit 안에서도 안정 정렬
- channel/time 범위를 벗어난 segment 미반환
- operator/admin 허용, viewer 또는 scope 없는 principal 거부
- media endpoint가 임의 path, `..`, symlink 탈출을 받지 않음
- `Range: bytes=...`에 206/Content-Range/Accept-Ranges, 잘못된 범위에 416
- media response가 전체 파일을 `HttpResponse::body`에 적재하지 않음
- Ops 이벤트 화면에 녹화 상태, timeline, event 우선 badge, 재생 control이 존재
- 자연어·vector 검색 input은 존재하지 않음

```bash
planned-command verify-v410-recording-timeline
planned-command verify-v410-recording-ui-contract
```

### Step 2: application DTO와 read service를 구현한다

`RecordingApplicationService`는 status, timeline query, opaque segment ID media resolve만
제공한다. `ResolvedRecordingMedia`의 absolute path는 transport 내부 DTO에만 있고 JSON에
serialize하지 않는다.

timeline item의 필수 JSON은 다음과 같다.

```json
{
  "segmentId": "opaque",
  "channelId": "1",
  "kind": "event",
  "displayPriority": 200,
  "startTimeMs": 0,
  "endTimeMs": 1,
  "eventId": "event-id",
  "completeness": "complete",
  "playable": true,
  "playbackUrl": "/ops/api/recordings/media/opaque",
  "supersededByEventIds": []
}
```

### Step 3: bounded Range sender를 구현한다

기존 `BuildHttpResponse`에 대용량 파일 body를 넣지 않는다. SSE와 같은 direct-send
경계에서 `SendFileRangeResponse(client_fd, request, resolved_media)`를 호출하고
`response_sent=true`로 표시한다. header를 먼저 보낸 뒤 `pread` 256KiB buffer로 지정
범위만 보낸다. catalog가 반환한 canonical root 내부 real path만 허용하고 전송 중 파일이
retention으로 지워지지 않도록 read lease를 잡는다.

### Step 4: `/ops/events`에 timeline을 추가한다

기존 direct-route 정책을 유지해 새 primary nav를 만들지 않는다. 녹화 상태 card, channel·시간
filter, event/continuous badge, completeness, quota 상태, `<video controls preload="metadata">`
재생을 추가한다. event card가 기본 선택되고 continuous 원본은 `원본 보기`로 펼친다.
검색 입력이나 후속 v4.2/v4.7 문구는 넣지 않는다.

### Step 5: GREEN과 문서 기록

```bash
planned-command verify-v410-recording-timeline
planned-command verify-v410-recording-ui-contract
./server.sh verify-docs-links
git diff --check
```

실제 UI 직접 조작은 이 static contract와 별도이며 Task 9의 사용자 승인 대상이다. 승인 시에만:

```bash
git commit -m "feat: 이벤트 우선 녹화 timeline과 재생 추가"
```

---

## Task 7: V410-S07 검색-ready 분석 관측과 FrameLocator

**현재 상태(2026-09-09): 구현·단계 검증 완료.** S06 마감 기준 db308d4d 위에서 구현했다.
실제 구현 위치·검증 결과는 `docs/release-evidence-v410.md` S07 절과
`docs/release-test-records.md` 최종 마감 기록을 따른다. S08은 미착수다.
사용자 승인 범위는 S07 구현·발견 문제 수정·단계 검증·문서 마감·커밋/푸시이며,
S08은 종료 보고에서 설명만 한다. 새 검색 UI·외부 저장소 의존성·장시간 검증은 포함하지 않는다.

### 실제 코드에 따른 안전 계약 보완

- 기존 AnalysisObservationV1은 frame_locator object가 필수이고 segment FK를 요구한다.
  기존 parser/serializer/fixture를 유지하고, 다중 선정 사유·track 요약·null locator는
  별도 AnalysisObservationV2 schema와 catalog/journal projection으로 추가한다.
- 같은 channel/track 번호라도 독립 tap/profile 또는 재시작이면 다른 객체다.
  내부 tracker namespace/generation과 stream epoch로 충돌을 막는다.
- decoded PTS를 처리 완료 wall clock이나 현재 epoch에 임의 결박하지 않는다.
  실제 keyframe 매핑·epoch·범위가 유일하게 검증될 때만 locator를 생성한다.
  모호함·공백은 null locator와 이유로 남긴다. 임의 frame index는 만들지 않는다.
- bounded 대기열에서 interval을 먼저 제거해 start/event/end를 우선한다.
  중요 관측만으로도 포화되면 명시적인 거부 수와 안전한 오류 코드를 기록한다.
  무제한 입력·저장 장애에도 nonblocking과 무손실을 동시에 보장한다고 주장하지 않는다.
- actual event_id는 EventRecord 생성 이후 narrow 내부 observer로 전달한다.
  기존 EventRecord/Event POST/SSE/WS/DataChannel 직렬화 계약은 변경하지 않는다.
- finalize callback은 빠른 알림만 전달하며 projector 쓰기·DB 조회를 동기 실행하지 않는다.
  종료 시 입력 해제·분석 종료·finalize·관측 drain의 수명을 직접 검증한다.

위 보완은 승인된 검색용 녹화 provenance 범위 안의 구현 결정이다.
실행 전 개별 항목과 RED/GREEN·실패/복구는 release-test-records에 등록·보존한다.

**수정 파일:**

- 수정: `include/analysis/analysis_types.h`
- 수정: `include/analysis/analysis_manager.h`
- 수정: `src/analysis/analysis_manager.cpp`
- 수정: `src/analysis/object_tracker.cpp`
- 생성: `include/recording/analysis_observation_projector.h`
- 생성: `src/recording/analysis_observation_projector.cpp`
- 수정: `src/application/media_server_application.cpp`
- 생성: `scripts/internal/recording_observation_smoke.cpp`
- 생성: `scripts/internal/verify_v410_recording_observations.sh`
- 수정: `CMakeLists.txt`
- 수정: `server.sh`
- 수정: `docs/release-evidence-v410.md`

### Step 1: RED bounded observation test를 작성한다

- track 첫 관측은 `track-start`
- interval 전 중간 frame은 저장하지 않고 interval 도달 frame은 `interval`
- event-triggered frame은 interval과 무관하게 `event`
- tracker 제거 직전 track은 `track-end` summary 한 번
- 60초·30fps 입력에서 1초 interval인 단일 track 중간 observation은 최대 61개 수준으로
  bounded
- 각 observation FrameLocator가 실제 segment와 UTC/PTS 범위 안에 있음
- segment gap 또는 삭제 뒤에는 가짜 playable locator를 만들지 않음
- detector가 없거나 tracking disabled여도 recording path는 실패하지 않음

```bash
planned-command verify-v410-recording-observations
```

### Step 2: analysis result observer를 additive하게 추가한다

`AnalysisManager` 생성자에 optional `AnalysisResultObserver`를 주입하고, tap mutex를 놓은 뒤
immutable result copy를 observer에 전달한다. observer 지연·실패가 detector worker와 live
fan-out을 막지 않도록 bounded queue를 가진 `AnalysisObservationProjector`로 넘긴다.

`ObjectTracker::Update`는 제거 조건을 만족한 track을 지우기 전에
`AnalysisResult::terminated_tracks`에 복사한다. 기존 `tracks`와 `detections` 의미는 바꾸지
않는다.

### Step 3: sampling과 summary를 구현한다

projector key는 `{channel_id, tracker_namespace, track_id, stream_epoch_id}`다.

주기는 전역 `MEDIA_SERVER_RECORDING_OBSERVATION_INTERVAL_MS`(기본 1000ms, 양수)로
설정한다. 이번 단계에서 기존 SourceRegistry policy와 hash 계약을 확장하지 않는다.

- 첫 confirmed/tentative track: start observation
- configured interval 경과: representative observation
- event-triggered detection: immediate observation
- terminated track: end observation과 first/last/duration/class/confidence 요약
- process/channel stop: `endedReason=stream-stopped`로 열린 track summary flush

동일 PTS에 여러 사유가 겹치면 하나만 저장하고 selection reason 배열에 모두 기록한다.
queue가 가득 차면 interval observation을 먼저 drop하고 start/event/end를 우선 보존한다.
중요 관측만 남은 포화 상태에서는 명시 거부하고 interval drop/critical rejection과
안전한 마지막 오류 코드를 status에 노출한다. 내부 경로나 오류 원문을 공개하지 않는다.

### Step 4: FrameLocator를 catalog로 해석한다

PTS와 stream epoch가 포함된 finalized segment를 찾고 keyframe anchor를 기록한다. 아직
writing인 segment의 observation은 pending queue에 두었다가 finalize callback에서 resolve한다.
segment가 corrupt/deleted면 observation은 남길 수 있지만 `frameLocator=null`과 reason을
기록한다.

구현 시 안전 경계: writer가 실제 수락한 최근 PTS 최대 256개의 불변 시간 사본을 사용하며,
시작·끝 범위 안이더라도 실제 수락 목록에 없는 PTS는 연결하지 않는다.
writer/decoded PTS rollback 또는 같은 stream key 녹화 재시작 후 모호한 epoch는
보수적으로 locator 미확정 상태를 유지한다. 지연 분석 결과에 최신 epoch를 덧씌우지 않는다.

### Step 5: GREEN과 문서 기록

```bash
planned-command verify-v410-recording-observations
planned-command verify-v410-recording-timeline
planned-command verify-v410-recording-catalog
git diff --check
```

승인 시에만:

```bash
git commit -m "feat: 녹화 검색용 분석 관측 저장 추가"
```

---

## Task 8: V410-S08 crash 복구, 손상 격리와 후속 버전 호환성 gate

### S08 잔여 전체 실행 승인 (2026-09-10)

**최신 목표로 갱신:** S08 잔여 전체 완료 후 커밋·푸시하고 S09도 진행한다.
이 목표의 실패는 AGENTS.md 3.3에 따라 기록 후 동일 단계에서 수정·재검증하며,
통과 전에 뒤 단계로 넘어가지 않는다. 아래 최초 승인 기록보다 최신 목표를 우선한다.
120분 검증 질문에 대한 사용자 `진행`에 따라
`verify-predev --soak-minutes 120` 실행은 승인됐다. 2026-09-11 실행 시점 정정:
S08은 단기·관련 회귀로 닫고, 장시간·UI 검증은 S09 통합 구현 후 최종 코드에서
수행한다. 동일 코드·환경·범위의 유효한 증거는 릴리즈 시 중복 실행하지 않는다.
기존 predev 장시간 검사는 녹화 직접 관찰을 대체하지 않는다. 녹화 전용 120분,
30분·UI 풀테스트 및 PR/main merge/tag/release는 아직 별도 명시 승인되지 않았다.
사용자의 실행 이유 질문은 새 테스트 실행 승인으로 해석하지 않는다.

사용자 `S08 잔여이슈 다 끝내고 보고`에 따라 기준 `f3736adf`에서 다음 세 묶음을
순차 개발·검증한다. 기존 B2b는 완료·푸시된 기준이며 재구현하지 않는다.
이 최초 승인에는 commit/push, S09 또는 버전 전체 장시간/UI 풀테스트가 포함되지
않았으나, 현재 권한과 실행 시점은 위 최신 목표 및 정정을 따른다.

1. **구현·단계 검증 완료 (2026-09-11)** — 최종화 복구: 완결된 media의 정확한 V1 metadata·checksum·소유 경로를 publish 전에
   내구 ticket으로 저장한다. 기존 cleanup이 ready partial을 먼저 삭제하지 못하게 한다.
   provenance 없는 orphan을 추정 등록하지 않으며 동일 ID와 tombstone을 우선한다.
   이벤트 MPEG-TS와 Pending link/source/output 결속도 포함한다.
2. **구현·단계 검증 완료 (2026-09-11)** — 시작 복구 연결: 원장 복원과 retention 구성 후 기존 내구 삭제 대기를
   먼저 수렴시키고, ready 복구와 known Finalized media 검사를 마친 뒤 녹화를 시작한다.
   새 용량 정책에 따른 삭제는 이 시작 복구에 끼워 넣지 않는다. 삭제 복구 오류·ready 충돌·
   검사 불가·보호된 손상의 상태 반영 실패는 시작 실패로 남기며, 기존 event hold/terminal
   release 계약을 유지한다. 단위44·실제 앱144개와 별도 seed cleanup1이 통과했다.
   녹화 off 복구와 유효 local source opt-in/녹화 on 정상 생성·복구 실패 시 생성 차단을 대조했다.
3. **종합 검증·근거 대조 완료 (2026-09-11)** — 종합 검증: crash 지점·손상·디스크 실패·중복
   재시작과 S01~S07 관련 회귀, V1 golden 호환성 및 실제 시작 연결의 기록을 대조했다.
   무변경 로직의 유효 증거는 재사용하고 startup 영향 회귀는 재실행했다. 메인 docs-links는
   226문서/1051링크/실패0, 임시root24개 부재 직접대조를 확인했다. 승인된 커밋·푸시는
   별도 실제 결과로 보고한다. S08 단계 완료이며 S09·버전 전체·릴리즈 완료는 아니다.

1번 구현 위치는 `recording_finalize_recovery.h/.cpp`, writer, event deriver/bridge,
catalog cleanup/recovery API, inspector MPEG-TS 연결이다. 기본20·통합140·root5와
S01~S07 관련 회귀·전체 build·문서 링크·diff 검사가 통과했다. 개별 결과와 최초 실패
수정 이력, 임시 root39개 정리는 `release-test-records.md`의 S08 finalize 최신 검증을
따른다. 공개 V1·이벤트 payload·권한·기존 재생 계약은 변경하지 않았다.
이는 1번 묶음의 분할 커밋 조건이며, startup 미구현을 S08 전체 완료로 확대하지 않는다.

| 테스트 카테고리 | 판정 | 직접 근거 | 근거 파일/행/기능 ID | 실행 승인 상태 |
| --- | --- | --- | --- | --- |
| 안정화 테스트 | 진행 대상 | S08 잔여 전체 개발·검증 지시 | Task 8 Step 1~5, 사전 등록할 finalize/startup case | 현재 개발 범위 focused·관련 회귀·전체 build |
| 30분 테스트 | 미진행 | 이번 요청은 S08 개발이며 버전 전체 close-out은 아님 | AGENTS.md 7.6.2·7.7 | 별도 실행 승인 없음; 버전 완료 필수 blocker는 유지 |
| 120분 테스트 | 진행 대상 | writer publish 및 시작·cleanup lifecycle을 직접 변경 예정 | gstreamer_segment_writer.cpp, media_server_application.cpp, AGENTS.md 7.6.2 조건4 | S09 최종 코드에서 실행; predev 승인됨, 녹화 전용 검사 미승인. S08 중간 단계에서 중복 실행하지 않음 |
| UI 풀테스트 | 미진행 | 이번 변경은 내부 복구이며 새 UI control 없음 | Task 8 구현 경계 | 별도 실행 승인 없음; 버전 완료 필수 blocker는 유지 |

Codex 담당은 기존 단일 `gpt-6-astra` / `medium` 재사용이다. 최종화는2/2/2/2=8,
startup은2/1/2/2=7, 종합 대조는2/1/2/1=6점이며 자동 상향하지 않는다.
메인은 계약·diff·완료 판정을 담당하고 하위 에이전트 생성을 금지한다.

### 2026-09-10 착수 범위: B2b 실제 파일 검사

최신 지시 `다음 진행할 이슈 개발 시작`은 다음 잔여 항목인 실제 영상 손상 검사에
한정한다. 기존 A·B1·B2a는 `e03a9a6b`까지 원격 반영된 기준이다. 이번 지시에는
커밋·푸시가 없으며 이전 분할 커밋 승인을 새 권한으로 사용하지 않는다.

- 정상 / 확정 손상 / 검사 불가를 구분하는 내부 검사기를 추가한다.
- 안전하게 연 고정 FD에서 크기·SHA-256과 MP4/WebM demux 결과를 확인한다.
  모든 압축 프레임의 디코딩 정상 여부까지 보장하는 검사는 아니다.
- I/O·권한·경로 안전성·검사 중 변경·시간 초과·플러그인 부재는 손상으로
  확정하지 않는다. 안정된 확정 손상만 기존 `MarkSegmentCorrupt`로 적용한다.
- 기존 hold·pending event·삭제 우선순위와 V1·관측 locator 계약을 유지한다.
  검사 중 catalog mutex를 장시간 점유하지 않으며 적용 전 대상 상태를 재확인한다.
- 파일 삭제·이동, orphan publish, 시작 복구 연결, S09는 이번 범위 밖이다.
  검사기 추가를 자동 복구 또는 S08 전체 완료로 보고하지 않는다.

| 테스트 카테고리 | 판정 | 직접 근거 | 근거 파일/행/기능 ID | 실행 승인 상태 |
| --- | --- | --- | --- | --- |
| 안정화 테스트 | 진행 대상 | B2b 검사기와 기존 손상 상태 적용 경계 변경 | Task 8 Step 1·2, B2b 사전 등록 항목 및 B2a 회귀 | 현재 단계 개발의 focused·관련 회귀·build 범위 |
| 30분 테스트 | 미진행 | 이번 요청은 B2b 한 항목이며 버전 close-out 아님 | AGENTS.md 7.6.2·7.7 | 명시 승인 없음; 버전 완료 필수 검증을 대체하지 않음 |
| 120분 테스트 | 미진행 | streaming/source lifecycle/startup 경로는 변경하지 않음 | 이번 B2b 변경 경계 | 명시 승인 없음; 새 위험 신호 발생 시 재판정 |
| UI 풀테스트 | 미진행 | 새 제품 화면·조작을 추가하지 않는 내부 검사기 | 이번 B2b 변경 경계 | 명시 승인 없음; 버전 완료 필수 검증을 대체하지 않음 |

담당은 Codex 단일 기존 서브에이전트 `gpt-6-astra` / `medium`이며 재위임을
금지한다. 영향도2·불확실성1·검증 난이도2·변경 범위1=6점으로 자동 상향은
없다. 메인은 안전 계약과 최종 diff·증거를 직접 확인한다. 정확한 개별 테스트
정의는 실행 전에 inventory와 release-test-records에 등록한다.

**B2b 구현·검증 결과:** `recording_media_inspector.h/.cpp`에 고정 FD 검사와
명시적 `InspectAndMarkRecordingMedia` 연결을 추가했다. 실제 media52개,
no-GStreamer1개, 추가 경계13개·콜백 상한15개 및 기존 B2a·B1·S03·S07·A 회귀와 전체 build가
통과했다. 검사 불가의 원장 불변, hold/Pending/삭제 보호를 확인했으며 기존 catalog
제품 코드는 변경하지 않았다. 정확한 실행·최초 RED·cleanup 기록은
release-test-records의 B2b를 따른다. 검사 범위는 H264/MP4·VP8/WebM의 checksum과
demux이며 전체 프레임 decode는 아니다. 16MiB 초과·시간 초과·seek는 콜백 단위
검증이며 실제 컨테이너의 과대 요청이나 OS I/O 정체 유발 증거는 아니다.
startup/orphan 복구 및 S08 전체 완료는 여전히 남아 있다.

**현재 상태(2026-09-09): 부분 구현.** 기준 S07 완료 커밋 `ea9f11e4`다.
S08-A는 실행 속성 누락을 보완하고 Node9개, golden4개, 실제 C++ reader89개와
기존 계약89개 검증을 통과했다. 실패·재검증 상세는 release-test-records의 S08-A를 따른다.
B1은 `RecordingJournal::Append`의 미commit 꼬리 원본 내구 격리와 안전한 후속 append,
`Replay` I/O 실패 구분 및 catalog Open/rebuild 거부를 구현했다. focused40개, S03
catalog45개·wiring9개, S01 및 A 회귀와 전체 build가 통과했다. 상세 기록은
release-test-records의 S08-B1을 따른다. 실제 영상 검사·복구와 종합 검증(B 잔여)은
남아 있어 S08 전체는 미완료다.
B2a는 `RecordingCatalog::MarkSegmentCorrupt`와 replay/SQLite 상태 전이를 구현했다.
최초 focused 86 pass/4 fail은 새 관측 fixture의 위치 해석 누락이었으며, 사용자 승인 후
실제 Resolve 결과를 저장하도록 테스트만 보완했다. S07의 조회 시 새 locator를 추정하지
않는 계약은 유지했다. 재검증은 focused92개, B1·S03·S07·A 회귀 및 전체 build가
통과했다. 손상 상태 유지·중복 원장 순서·삭제 우선순위·사용 중 대상 거부가 이번
완료 범위이며 자동 파일 손상 검사나 startup 복구 연결은 아직 미구현이다.
기존 V1 golden fixture 호환성 검증(A)을 먼저 고정하고 복구 구현·통합 검증(B)을 이어간다.
A 통과만으로 S08 전체 완료를 뜻하지 않는다. 당시 승인 범위에는 S08 개발·단계 검증과
필요 시 분할 커밋이 있었으며, 이후 명시 지시로 A·B1·B2a를 푸시했다.
현재 작업의 권한은 위 2026-09-10 착수 범위를 따르며 과거 승인을 재사용하지 않는다.

**수정 파일:**

- 생성: `include/recording/recording_recovery.h`
- 생성: `src/recording/recording_recovery.cpp`
- 수정: `src/recording/recording_catalog.cpp`
- 수정: `src/recording/recording_supervisor.cpp`
- 생성: `test/fixtures/recording/v1/recovery/`
- 생성: `scripts/internal/recording_recovery_smoke.cpp`
- 생성: `scripts/internal/verify_v410_recording_recovery.sh`
- 생성: `scripts/internal/verify_v410_recording_fixture_compatibility.mjs`
- 수정: `CMakeLists.txt`
- 수정: `server.sh`
- 수정: `docs/project-feature-test-inventory.md`
- 수정: `docs/stream-verification.md`
- 수정: `docs/release-evidence-index.md`
- 수정: `docs/release-evidence-v410.md`

### Step 1: crash-point fixture를 먼저 만든다

실제 구현은 초기 단일 `recording_recovery.h/.cpp` 구상 대신 원장(B1), 손상 상태(B2a),
`recording_media_inspector`, `recording_finalize_recovery`, `recording_startup_recovery`로
분리했다. 시작 연결은 `media_server_application.cpp`의 supervisor 생성 전에 두므로
`recording_supervisor.cpp` 자체를 변경하지 않는다. 초기 파일 목록이 별도 미구현
recovery 모듈을 추가하라는 뜻은 아니며, 각 구현·fixture·결과는 아래 단계와 중앙 기록에 대응한다.

각 fixture는 마지막 성공 단계와 예상 복구 상태를 manifest로 가진다.

- partial write 전/중/후
- final rename 뒤 journal 전
- journal 뒤 SQLite 전
- deletion_requested 뒤 unlink 전
- unlink 뒤 deletion_completed 전
- truncated/corrupt journal
- corrupt SQLite
- missing media
- checksum mismatch
- event link는 있으나 derived clip 없음

```bash
planned-command verify-v410-recording-recovery
planned-command verify-v410-recording-fixture-compatibility
```

### Step 2: 시작 복구 state machine을 구현한다

B 구현은 회귀 경계를 나누어 진행한다. B1은 원장 꼬리 복구, B2a는 알려진 segment의
손상 상태를 원장·메모리·SQLite에 동일하게 반영하는 기반이다. B2a에서는 파일 검사나
시작 경로를 아직 연결하지 않는다. 사용 중인 hold 및 pending event 참조 대상은 상태
변경을 거부하고 삭제 대기·삭제 완료를 우선한다. 기존 ID의 finalized 재등장도 최초
메타데이터를 바꾸거나 손상 판정을 취소하지 못하게 한다. 각 묶음 통과 뒤에만 다음
통합을 진행하며, 기반 검증을 자동 손상 검출 또는 S08 전체 완료로 확대하지 않는다.

S07까지의 실제 writer는 final rename 뒤 callback에서 journal을 기록한다. 파일명이나
cleanup marker의 partial leaf만으로 source/channel/epoch/시간을 복원할 수는 없다.
따라서 복구용 내구 정보가 없는 이전 orphan은 채널·시간을 추정해 정상 등록하지 않는다.
최종화가 끝난 소유 partial의 메타데이터와 checksum을 rename 전에 내구 저장하고,
재시작 시 journal/tombstone을 먼저 대조하는 방식으로 이 공백을 보완한다.
기존 S04/S05 v2 cleanup marker가 소유한 미완성 partial 정리 규칙은 유지한다.
복구 성공은 단순 container magic 판정이 아니라 실제 완결성·checksum·범위·소유권으로
확인하며, 새 ID 발급도 삭제된 원본 ID의 재생성 우회 수단으로 사용하지 않는다.

복구는 journal replay를 먼저 수행하고 filesystem scan을 대조한다. 완결된 `.partial`과
final orphan은 유효한 내구 ticket의 원래 ID·메타데이터·소유 경로가 확인되고
checksum/container/range 검사를 통과할 때만 no-replace publish 및 catalog 반영을 한다.
새 ID를 추정 발급하지 않는다. ticket 없는 orphan은 정상 등록하지 않는다.
손상이 확정된 미등록 파일은 정상 등록을 거치지 않고 격리 증거를 남기며,
이미 등록된 파일의 손상 상태 전이는 기존 hold·Pending 보호를 따른다.
검사 불가나 provenance 충돌은 손상 확정으로 대체하지 않고 원본 보존·오류로 구분한다.
격리는 원위치 논리 격리로 수행한다. 정확한 ticket·파일 binding에 대한 내구 손상
진단을 보존하고 정상 등록·재생을 차단한다. 진단 저장과 known ID 손상 상태 기록
사이에서 중단돼도 동일 정보로 재시작이 수렴해야 하며, 파일 이동 도중의 영구 복구
오류를 합격으로 처리하지 않는다. ready/cleanup marker는 보존하여 완성된 partial의
기존 cleanup 삭제를 막는다. 충돌·검사 불가·보호된 Pending 참조는 오류로 구분한다.

`deletion_pending`은 media 존재 여부에 따라 unlink 재시도 또는 tombstone completion으로
수렴한다. 삭제 완료 뒤 같은 ID media를 다시 생성하지 않는다.

### Step 3: golden fixture 불변 gate를 만든다

fixture 파일의 SHA-256 목록을 고정한다. 후속 v4.2+는 이 fixture를 수정하지 않고 reader를
호환시켜야 한다. gate는 다음을 검사한다.

- v1 required field 의미 변경 없음
- additive optional field만 허용
- fixture digest 변경은 명시적 새 contract version 없이는 실패
- SQLite rebuild 결과와 JSONL fallback 결과 parity
- 검색·embedding index 파일이 녹화 source-of-truth에 포함되지 않음

### Step 4: feature/test inventory와 evidence를 연결한다

각 단계에서 이미 등록한 고정 ID를 재번호화하지 않고 종합 검증에 연결한다.
S05의 `V410-S05-I*`도 보존한다. 신규 동작은 구현 단계에서 시험 실행 전에 등록하며
S08까지 미루지 않는다. 각 ID는 owner symbol, route/control, positive/negative verifier와
안정화/UI/30분/120분 판정 근거를 가진다. inventory는 실행 PASS가 아니다.

### Step 5: GREEN과 회귀 검증

```bash
planned-command verify-v410-recording-recovery
planned-command verify-v410-recording-fixture-compatibility
planned-command verify-v410-recording-observations
./server.sh verify-v410-event-recording
./server.sh verify-v410-recording-retention
./server.sh verify-v410-recording-catalog
./server.sh verify-v410-recording-recorder
./server.sh verify-v410-recording-contracts
./server.sh verify-docs-links
git diff --check
```

승인 시에만:

```bash
git commit -m "test: 녹화 복구와 v1 호환성 gate 추가"
```

---

## Task 9: V410-S09 통합 안정화와 release readiness 판정

**진행 (2026-09-11):** S08은 `4b7639db`와 `11953256`으로 커밋·푸시했고 원격과
동기화를 확인했다. 현재 S09은 실제 runtime 부분 통합 검증(아래 oracle 1·5·7)의
구현·메인 검토를 마쳤고, 실제 앱 이벤트·HTTP·보존·재시작 통합 검증에 착수했다.
runtime 최신 검증은 518 assertions와 cleanup 1개가 통과했고, 조기 실패 종료 경계도
실제 source 시작 후 실패 주입으로 확인했다. 상세 실패·수정·실행 기록은 중앙 테스트
기록의 S09 runtime RAII 절을 따른다. 초기 스레드 증가 원인과 장시간 RSS 판정은 미확정이다.
후속 작업에서 실제 인증90713과 관측32023을 통과했고 장시간 녹화 runner의 구현·순수
검증 및 정적 통합 검증을 마쳤다. 전체 진입점 `--all`은 세션48365로 첫 실제 실행을
마쳤으며 runtime517·인증535 checks와 두 단계 정리 확인 후 exit0이었다.
장시간 녹화·자원 안정성·UI 및 S09 전체 완료는 아직 아니다. 최신 개별 실행 결과는
중앙 테스트 기록을 따른다.
단일 Astra/medium 담당자(2/1/2/2=7)를 재사용하고 메인이 계약·최종 판정을 맡는다.

**수정 파일:**

- 생성: `scripts/internal/verify_v410_recording_foundation.sh`
- 생성: `scripts/internal/verify_v410_recording_longrun.sh`
- 수정: `server.sh`
- 수정: `docs/config-reference.md`
- API 설명: 실제 source-of-truth인 `docs/config-reference.md`의 녹화 API 절에 반영
- 수정: `docs/stream-verification.md`
- 수정: `docs/project-feature-test-inventory.md`
- 수정: `docs/release-evidence-v410.md`
- 수정: `docs/release-evidence-index.md`
- 수정: `docs/v410-v49-recording-search-roadmap.md`
- 수정: `docs/development-backlog.md`

### Step 1: 통합 verifier를 작성한다

`verify-v410-recording-foundation`은 앞 단계 verifier를 호출하는 wrapper에 그치지 않고 다음
cross-component oracle을 직접 확인한다.

- 등록 source opt-in → source worker/recorder 한 개 → segment finalize
- event 발생 → overlap link → event clip/fallback → priority timeline → media range read
- continuous quota 초과 → oldest delete/tombstone → 녹화 계속
- restart → 같은 journal/catalog state → 중복 ID 없음
- observation → FrameLocator → 실제 segment 시간 범위
- auth 없는 media ID 접근 거부, 다른 channel scope 누출 없음
- runtime stop 후 subscriber/thread/.partial 누수 없음

구현 경계 (2026-09-11): 공개 status schema에 검증용 카운터를 추가하지 않는다.
실제 SessionManager·RecordingSessionService·AnalysisObservationProjector·catalog를
연결한 C++ 통합 검증으로 worker/subscriber와 FrameLocator를 직접 관측하고,
실제 앱 HTTP 검증으로 event 파생 완료와 frame-buffer fallback을 각각 확인한다.
fallback은 원본 세그먼트 전환과 다른 경로이며, 요청 전 구간 충족을 보장하지 않는
`partial` 상태와 실제 재생 가능 여부를 각각 확인한다.
단기 runtime은 warmup 1회 후 시작·종료 3회를 확인한다. 녹화 소유 카운터의 종료값과
실제 process thread/fd 측정값은 분리하며, 라이브러리 전역 pool의 증가를 근거 없이
허용하지 않는다. 단기 RSS 측정만으로 장시간 누수 부재를 판정하지 않는다.
신규 개별 테스트 항목은 실행 전에 inventory와 중앙 테스트 기록에 등록한다.
auth 5개 환경변수가 없으면 auth를 실행하지 않고 전체 통합 PASS도 보류한다.

#### S09 실제 fallback identity 정합 보완

AP13 실제 앱 진단에서 원본 manifest의 stream/channel은 shared stream key이고,
catalog link의 source/channel은 녹화 채널 ID여서 기존 조회기의 직접 비교가 실패함을
확인했다. 원본 이벤트·manifest·공개 API 및 V1 JSON 필드를 변경하지 않는다.
신규 연결은 기존 opaque fallback ID에 `fallback-bound-v1-` 접두사와 SHA-256을 담는다.
고정 domain과 길이 접두 인코딩으로 event ID, link ID, catalog source/channel,
원본 stream/channel을 결속한다. 첫 필드는 domain
`media-server.recording-fallback-binding.v1`이며, 각 필드는 UTF-8 바이트 길이의
십진수와 `:` 및 원문 바이트를 순서대로 연결한다. 빈 원본 stream은 그대로 해시하되
생산 resolver의 조회 키만 원본 channel로 대체한다. 생산 시 실제 녹화 채널 resolver의 일치를 확인하고,
조회 시 manifest와 내구 catalog만으로 같은 결속을 검증한다. 조회에 현재 활성 세션을
요구하지 않으므로 재시작 이후에도 검증할 수 있어야 한다.

이미 발급된 bound ID는 다른 결속으로 덮어쓰지 않는다. resolver 실패·채널 불일치·
해시 계산 실패는 기존 ID/locator를 보존하고 새 연결을 거부한다. bound ID 형식이나
해시가 잘못됐으면 기존 ID 판독 경로로 강등하지 않는다. 기존 legacy ID는 자동 승격하지
않고 기존 manifest와 catalog의 직접 identity 검사를 유지한다. 따라서 과거 잘못 매핑된
legacy 자료가 이 수정만으로 재생 가능해졌다고 보고하지 않는다.

이 해시는 신뢰된 journal에 저장된 identity 연결을 검증하는 값이며, 임의 journal 변조를
막는 서명이나 미디어 전체 checksum은 아니다. 기존 event ID, 채널 권한, 경로·파일 형식·
크기·symlink·중복 ID·tombstone 검사는 유지한다. 실제 bridge→catalog→reader 양성,
재시작 내구성, 각 identity 변조 거부, 반복 등록 안정성, resolver 실패 시 보존,
legacy 호환 및 OpenSSL 미지원 시 거부를 실행 전에 개별 등록하고 RED→GREEN으로 확인한다.
이 절은 구현 방침이며 구현·검증 완료 기록이 아니다.

실제 앱 보존 검증은 event 검증과 별도 채널로 격리해 파생 중 hold와 삭제 기대값이
섞이지 않게 한다. admission의 기본 예상 세그먼트 예약 64 MiB를 무시하고 quota를
수 KiB로 낮춰 녹화 차단을 순환 보존 실패로 오판하지 않는다. 실제 생성 크기를 관측한
뒤 예약 하한을 포함한 quota로 admission-triggered oldest-first 삭제와 후속 finalize를
확인한다. 이것만으로 완료 파일 총량의 quota 초과 검증을 대체하지 않는다. 실제 앱에서
충분한 녹화 파일을 만든 뒤 총량보다 작은 유효 quota로 변경해 삭제·계속 녹화도 확인한다.
삭제 전 eligible 후보의 시간·ID 순서를 독립 계산하고 journal deletion 요청/완료 및
실파일 삭제를 대조한다. quota 변경에 의한 revision/epoch 전환은 기존 정책을 유지한다.

S09 실제 진단에서 quota와 다음 segment 예약이 모두64MiB이면 새 finalized도 즉시
삭제되어 live 목록 폴링이 녹화 지속을 놓침을 확인했다. AP07 삭제 완료 이후의 원장
cursor와 기존 ID를 고정하고, 이후 서로 다른 신규 finalized 최소2개의 시간 진행과
유효 메타데이터를 확인한다. quota 변경 시 이전 writer가 종료하며 만든 파일 하나를
녹화 재개로 오인하지 않는다. 삭제된 신규 파일은 finalized→삭제 요청→삭제 완료 순서와
실파일 부재를 대조한다. 삭제된 파일의 SHA를 다시 읽었다고 보고하지 않으며,
quota 복원 후 신규 녹화를 확인하고 정상 종료한 뒤 남은 파일의 실제 크기·SHA를
검사한다. fixture 검사는 판정기의 검증일 뿐 실제 앱·재시작 검증을 대체하지 않는다.

#### S09 AP10 실제 녹화 자료 인증 검증

비인증 실제 앱66598의 자료 생성 경로를 재사용하되, 별도 `--app-auth` 부분 실행은
`AUTH_MODE=auto`와 실제 setup/login/user API를 사용한다. 합성 S06 seed나 인증 우회
사용자 파일을 사용하지 않는다. 실행 전 인증 환경변수5개의 존재·검증기 요구 길이·
상호 구분을 확인하며, 미충족이면 서버나 임시 root를 만들지 않는다. 값과 cookie는
메모리에만 두고 로그·명령행·자식 환경·저장소 문서에 기록하지 않는다. 제품이 생성한
passwordHash 사용자 파일은 격리된 임시 root 안에서만 사용하고 종료 시 정리한다.

실제 상시 segment, 파생 이벤트 영상, frame-buffer fallback 각각의 같은 URL을
아래 권한으로 대조한다. 성공 결과는 실제 파일 바이트와 비교한다.

| 계정/권한 | 미디어 GET Range | timeline | status |
| --- | --- | --- | --- |
| 미인증 | 401 | 401 | 401 |
| admin | 206·실제 바이트 일치 | 200 | 현재 채널 전수 |
| operator·ops:read·해당 source:read | 206·실제 바이트 일치 | 200 | 허용 채널만 |
| operator·ops:read·다른 source:read | 404·없는 ID와 같은 거부 | 403 | 자기 허용 채널만 |
| viewer | 403 | 403 | 403 |
| operator·해당 source:read만, ops:read 없음 | 403 | 403 | 403 |

제한된 계정에는 global observations를 포함하지 않으며 응답에 원본 source 경로나
인증 material을 노출하지 않는다. 허용된 timeline은 실제 영상 시간 범위에 대해
비어 있지 않은 items와 요청 채널만 포함하는지 확인한다. fallback이 파생 영상으로
대체되는 정상 전이 때문에 timeline에 과거 fallback ID를 계속 요구하지 않는다.
원본 opaque ID의 접근 권한과 실제 바이트는 media API에서 별도로 확인한다.
필수 개별 검사가 하나라도 빠졌으면 인증 suite를 성공 종료하지 않는다.
재시작 시 기존 사용자를 다시 setup하지 않고 로그인해
권한 검사를 유지한다. `--app-auth` 통과는 인증된 실제 앱 통합 부분의 증거이며,
runtime·장시간·UI를 포함한 전체 foundation 또는 S09 완료로 확대하지 않는다.
인증 환경 미설정 상태에서는 구현과 순수 helper 검증만 수행하고 실제 인증 실행은 보류한다.

#### S09 기본 통합 실행 연결

`verify-v410-recording-foundation --all` 및 인자 없는 기본 실행은 인증 필수값을
임시 root 생성 전에 확인한 뒤 기존 runtime wrapper와 `--app-auth` 앱 검사를 순서대로
실행한다. 각 단계의 실제 정상 종료와 완료 결과를 확인하고 실패하면 후속 단계를
실행하지 않는다. 하위 wrapper cleanup 실패도 전체 실패다. 테스트용 실행 함수 주입은
단위검사 안에서만 사용하고 CLI/env로 실제 검사 대신 가짜 실행기를 고르는 기능은 없다.
개별 출력은 보존하되 비밀값을 노출하지 않으며 마지막 통합 결과와 부분 앱 결과를
구별한다. 인증값은 runtime 자식에 전달하지 않는다.

이 연결은 runtime/인증 앱 통합 실행의 완주 판정이며 장시간 자원 추세·UI·30분·120분
및 버전 완료를 뜻하지 않는다. 단계 성공만으로 남은 시간별 안정성 판정을 지우지 않는다.
기존 부분 모드·oracle 단위 모드는 그대로 유지하고 `--all`을 앱 내부로 넘겨
준비 상태 오류를 내던 분기를 제거한다. 실제 전체 실행은 인증 환경 사전조건을
충족한 뒤 수행하며, 현재는 순서·실패 전파·완료 누락 거부의 단위 검증부터 진행한다.

상위 suite는 별도 timeout으로 하위 wrapper를 먼저 강제 종료하지 않는다. 앱 검사기가
별도 그룹으로 소유한 서버를 두고 상위 wrapper만 종료하면 finally 정리를 건너뛸 수
있기 때문이다. 출력 상한 초과는 실패로 기록하고 더 저장하지 않되 하위 검사기의
기존 안전 중단·cleanup과 close를 기다리며 후속 단계를 차단한다. 이 방식은 새 전역
강제 종료 시간 보장이 아니며, 컴파일 또는 OS 수준 정체의 완전한 제한을 주장하지 않는다.

### Step 2: 테스트 필요성 판정표를 먼저 작성한다

2026-09-11 판정: 초기 구상표의 `필수 후보`와 별도 외부 장비 영역을 현재 AGENTS.md
7.6.2의 네 영역으로 정규화한다. UI·30분은 버전 완료 필수 항목이며 미실행은 blocker다.
120분은 이번 writer/startup lifecycle 변경과 기존 실행 승인을 직접 근거로 삼는다.

| 테스트 카테고리 | 판정 | 직접 근거 | 근거 파일/행/기능 ID | 실행 승인 상태 |
| --- | --- | --- | --- | --- |
| 안정화 테스트 | 진행 대상 | 사용자 목표 S09 진행, 아래 통합 oracle 구현·검증 | Task9 Step1, S08 startup ST01~14 | focused·관련 회귀·build·문서 검증 승인; auth는 필수5개 env 사전 충족 필요 |
| 30분 테스트 | 진행 대상 | 현재 버전 로드맵 완료 판정의 필수 evidence | AGENTS.md7.6.2·7.7, Task9 readiness | 승인 실행52899 exit0,109pass/0fail/1skip,20회; 개별 결과 보존 및626경로 cleanup 완료 |
| 120분 테스트 | 진행 대상 | writer 최종화와 실제 startup/cleanup lifecycle 변경 | gstreamer_segment_writer.cpp, media_server_application.cpp, FR09~10·ST01~14 | predev120 session96360 종료·보존·cleanup 완료. 녹화 직접120도 승인되었으며 30분·UI 통과 뒤 실행 |
| UI 풀테스트 | 진행 대상 | 현재 버전 Ops timeline·재생 UI와 버전 완료 필수 evidence | Task6 `/ops/events`, AGENTS.md7.6.2·7.9 | 승인 실행14128은 clean worktree 선수조건에서exit1; 실제 브라우저 미실행. 검토·커밋 승인 후 재개 필요 |

외부 RTSP/ONVIF는 독립 테스트 영역으로 만들지 않고 안정화의 조건부 항목으로 기록한다.
현재 외부 endpoint/credential/실기기 실행 승인이 없으므로 실행하지 않으며 PASS 근거도 아니다.
이 표는 필요성·승인 판정이고 실제 실행 PASS가 아니다. predev120만으로 직접 녹화
장시간 검사 또는 30분·UI 결과를 대체하지 않는다.

### Step 3: 승인된 범위의 안정화만 실행한다

#### 2026-09-11 predev120 종료 상태

아래 실행 전 기록은 당시 이력이다. 이후 session96360은 요청 soak120분,
80회 반복, outer409pass/0fail/1skip으로 종료했다. 결과 전수 대조와 임시2306경로
정리를 마쳤으며 상세 수치·제외·최초 실패 이력은 `docs/release-test-records.md`의
`S09 PD120 96360` 절을 따른다. 같은 코드·환경·범위의 유효 증거를 인계나
30분/UI 순서만을 이유로 다시 실행하지 않는다. 관련 코드 변경이나 실패 신호가
생기면 영향 범위와 별도 실행 승인을 다시 판단한다.

후속 사용자 승인으로30분 안정화 → UI 풀테스트 → 녹화 직접120분 순서의 실행이 허용되었다.
외부 실기기·외부 서비스 및 릴리즈 작업은 포함하지 않는다. 자원 추세 판정은 미완료이며
이번 predev 종료로 `resourceTrendPass` 또는 S09 전체 완료를 승격하지 않는다.

#### 2026-09-11 predev120 실행 전 직접 확인

`--all`48365 통과 후 기존 승인된 predev120의 실행 준비를 읽기 검토했다.
장시간 테스트 자체는 아직 실행하지 않았다. 다음 세 경계는 실행 전 보완 대상이다.

- `verify_predev_stability.sh`의 `start_server`는 저장 경로를 별도 지정하지 않고
  상속 환경에서 서버를 실행한다. `MEDIA_SERVER_SOURCE_REGISTRY`,
  `MEDIA_SERVER_ANALYSIS_REGISTRY`, `MEDIA_SERVER_ANALYSIS_EVENT_STORAGE_PATH`,
  `MEDIA_SERVER_RECORDING_STORAGE_ROOT`의 격리 및 입력 fixture 경계를 먼저 확정한다.
  실제 기존 데이터 접근이 발생했다는 뜻은 아니다.
- 바깥 `--fail-fast`는 있으나 integrated-smoke의 `server.sh test` 인자에 전달하지
  않는다. `test_all.sh`는 기본 `FAIL_FAST=0`이고 별도 CLI 인자로만 켠다.
  기존 옵션을 내부 단계에 전달하는 최소 보완을 검토하며 제품 동작은 바꾸지 않는다.
- 최초/갱신 report 명령은 `/tmp/media_server_*summary*.json` 전체를 입력으로 받는다.
  현재 실행과 자식 실행에서 생성한 명시적 증거만 모아 과거 결과 혼입을 막아야 한다.
  현재 summary 파일 자체의 판정이 잘못됐다고 확정한 것은 아니다.

기존 검증 기록을 읽기 조사나 준비 완료로 대체하지 않는다. 보완 구현 전 개별 회귀
항목을 등록하고, 정상·실패 전달·경로 격리·보고서 입력 범위를 focused 검증한다.
장시간 테스트의 시간 축소 또는 테스트 제외로 이 문제를 우회하지 않는다.

보완 범위 결정: 주 서버 저장 경로는 위 설정에 published views/auth users/이벤트
snapshot·clip 경로와 전용 GST cache를 더한 명시적 임시 환경으로 격리한다.
운영 foreground 스크립트나 제품 기본값은 수정하지 않는다. 비밀번호가 필요 없는
auth-off predev 프로세스에는 앞선 인증 검사의 임시 비밀번호를 전달하지 않는다.
보고서 입력은 predev 자신의 `SUMMARY_FILE` 하나로 제한하는 최소 변경을 우선한다.
그 파일의 `steps`는 이번 실행의 개별 명령·결과·로그 경로를 가진다. 자식의 상세
결과는 해당 step 로그에서 별도로 전수 보존하며, 짧은 Markdown 리포트가 상세
전수표를 대체한다고 주장하지 않는다. 보고서 생성 실패의 전파도 보존해야 한다.
공통 summarizer의 다중 파일 기능이나 기존 UI/미디어 기능은 변경 대상이 아니다.

내부 `test_all` report smoke에도 별도 전체 glob이 있어 같은 입력 한정 경계를
적용한다. 진행 중에는 무출력 helper가 현재 부분 summary를 쓰고, 마지막 기존
print_summary가 최종 카운터로 갱신한다. 완료 문구를 조기에 출력하지 않는다.
기존 `media-server.test-summary.v1` schema는 passCount/failCount/skipCount를
사용하므로 공통 summarizer의 pass/fail 전용 해석에 그대로 넣으면 수치가 틀린다.
이 직접 인터페이스 확인에 따라 해당 exact schema의 카운터·상태 해석 지원만
최소 추가한다. 앞선 ‘공통 summarizer 미변경’ 구현 가정은 이 범위에 한해 정정하며,
다중 파일 기능과 다른 schema의 기존 해석은 유지하고 별도 회귀로 확인한다.

PF 인자 전달 보완 결과: `verify_predev_stability.sh`는 명시 `--fail-fast`만
integrated `server.sh test`에 전달하도록 최소 수정했다. 실제 main/run_step을
서버 없는 경계 대체와 실행한 focused 검사는 최초 utility 실패16/18,
수정 전 예상 RED32/2를 거쳐 최종88312에서34/0을 기록했다. 기존 predev
first-fail/cumulative fixture 4개 assertion이 포함되며 실제 test_all 전체나
장시간 PASS는 아니다. 메인이 diff·검증 경계를 검토하고 임시15경로 부재를
직접 확인했다. 개별 결과는 중앙 release-test-records의 PF 절을 따른다.

AP10 실제 인증 첫 실행40595에서는 계정 생성/로그인과 continuous 권한 경계 통과 후
관리자 status 채널 집합 비교가 실패했다. `SourceViewRegistry`는 빈 목록에 기본
소스를 seed하지만 검증기의 `actualSourceIds`는 성공 POST만 기록한다. 초기 기대 집합은
녹화 status 응답이 아니라 독립된 소스 registry/admin 소스 목록에서 확보해야 한다.
이후 성공한 생성과 재시작 시 집합을 대조하고, 권한별 exact 집합 비교를 유지한다.
기본 소스 삭제·권한 정책 변경·subset 비교 완화로 이 검증을 통과시키지 않는다.
실패 실행의 실제 응답 ID 목록은 보존되지 않아 코드상 원인 후보와 재실행 확인을 구분한다.

기본 focused/static 승인 범위가 주어진 경우:

```bash
./server.sh build
planned-command verify-v410-recording-foundation
./server.sh verify-v410-entry-baseline
./server.sh verify-release-metadata
./server.sh verify-script-inventory
./server.sh verify-project-inventory
./server.sh verify-docs-links
git diff --check
```

UI/30분/120분은 사용자가 해당 묶음을 명시 승인한 경우에만 별도 실행한다. longrun은
bounded test root와 작은 quota를 사용해 rollover, fd/thread/RSS 증가, event priority,
restart를 관찰하고 테스트 media는 release evidence 최소 산출물만 남긴 뒤 정리한다.

장시간 측정 경계: PID별로 warmup 전후 RSS·FD·thread와 실제 segment/link/observation/
tombstone 수·journal 크기를 함께 기록한다. 현재 catalog는 삭제 이력과 관측 메타데이터를
유지하므로 저장된 항목 증가를 분리하지 않은 RSS 상승만으로 누수 또는 정상이라고
단정하지 않는다. 재시작 전후 프로세스 표본을 하나의 연속 RSS 기울기로 합치지 않는다.
카운터가 사라졌거나 측정 불가한 표본은 0으로 대체하지 않는다. 실행 종료 코드와
자원 추세 판정을 분리하고, 원인 미확정·검토 대기 상태는 최종 안정성 PASS가 아니다.

측정기 구현 경계: 기존 runtime smoke의 `Measure()`는 자기 프로세스를 측정하므로
실제 서버 장시간 검사에 그대로 사용하지 않는다. test-only 외부 PID collector를 두고
macOS는 `proc_pidinfo`의 시작 식별자·task 정보·FD 목록을, Linux는 해당 PID의
`/proc` 시작 시각·상주 페이지·task/FD 목록을 읽는다. 시작 식별자를 측정 전후 대조해
PID 재사용이나 종료 중 부분 표본을 거부한다. 측정 불가 항목은 null과 오류로 남기며
부분 성공을 유효한 전체 표본으로 만들지 않는다. Linux 실행 증거가 없으면 macOS
검사 통과를 Linux 통과로 확대하지 않는다.

먼저 별도 제어 프로세스의 FD·스레드·실제 접근한 메모리 증가 및 종료를 짧게 관측한다.
이 검사는 collector의 정확도 검증이며 서버·녹화·장시간 PASS가 아니다. journal의
장시간 집계는 완결된 줄의 offset 기반 증분 방식으로 설계하며, 현재 단기 `state()`의
매회 전체 재읽기를 장시간 샘플러에 그대로 복사하지 않는다. 과거 앱66598의 AP07
cursor가46987이었던 사실만으로 메타데이터 증가가 정상 또는 누수라고 단정하지 않는다.
mutation 유형별 증가와 고유 entity 수·bytes를 함께 관측한 뒤 한계와 추세를 판정한다.
샘플 주기·warmup·자원 추세 허용 기준은 실제 측정과 함께 확정해야 하는 잔여 설계다.

장시간 도구 구현은 실행 흐름과 자원 요약을 분리한다. 기존 observer 표본을 PID와
startIdentity별로 묶어 첫값/마지막값/최고값/실측 시간과 원장 증가를 함께 보존한다.
5분 warmup은 기존 runtime longrun과 비교하기 위한 관찰 구간이며 메모리가 안정됐다는
보장이 아니다. warmup 이후 표본이2개 미만이면 delta/rate는 null·insufficient로 남긴다.
누락 수치, 시간 역전, 같은 PID의 identity 변경, 누적 원장 카운터 감소는 정상0이나
새 기준점으로 대체하지 않는다. 상한을 넘는 입력은 오류로 처리하고 몰래 잘라내지 않는다.
요약 계산 단위 검증은 실제 장시간 실행 또는 자원 안정성 검토를 대신하지 않는다.
자원 허용 범위가 확정되지 않은 동안 resourceTrendPass=false/reviewRequired=true를
유지한다. 이 요약기를 이유로 단기 관측을 장시간 완료로 승격하지 않는다.

실제 runner 연결 시 기존 단기 시나리오의 초기화·정리 경로를 재사용하되 별도 명시
장시간 모드에서만 지속 녹화 구간을 추가한다. 초기 기능 확인 후 같은 PID를 유지하며
실시간으로 진행을 관측하고, 마지막 정상 종료 뒤 새 PID의 archive 복구를 확인한다.
재시작 snapshot 대조 중 보존 정책이 새 데이터를 삭제하는 경합은 테스트의 정상 API로
녹화를 일시 비활성화한 뒤 종료/복구 대조/재활성화하는 순서로 통제한다. 제품 pin이나
삭제 정책을 수정하여 통과시키지 않는다. 테스트 quota는 두 채널의 실제 파일과 입력,
이벤트 파일 및 원장이 기존448MiB 선제/512MiB 상한 안에 있도록 별도 장시간 모드에
한정해 배정한다. 정확한 duration·quota·진행 assertion과 단기 경로 불변을 메인이
구현 위임 전에 확정하며, 사용자 실행 승인은 별도로 확인한다.

2026-09-11 인증 통과 후 runner 구현 계약을 확정했다. 공개 명령은
`verify-v410-recording-longrun --duration-minutes 120`이며 무인자·다른 시간·알 수 없는
옵션은 임시 디렉터리나 서버 생성 전에 거부한다. 별도 내부 장시간 모드에서만
AP09 복구 이후 같은 PID를 120분 유지한다. 5초 간격의 증분 표본과 채널별 최대30초
이내 새 finalized 진행, 실제 삭제 요청·완료를 확인한다. 5분 warmup과 PID별 요약은
관측 분류이며 자동 안정성 PASS 기준이 아니다. 표본10000개 상한을 유지한다.
같은 장시간 구간의 PID/startIdentity와 시작·종료 표본 커버리지를 대조하며 표본 간
최대 간격15초를 넘으면 수집 연속성 실패다. 이 값은 메모리 정상 범위가 아니다.
채널9101/9201의 continuous/event quota는 각각128MiB, age는3시간으로 설정하되
전체 root448MiB 선제 중단/512MiB 상한과 기존 로그·ID 집계 상한을 유지한다.
duration은 monotonic 시간으로 측정하며 전체 안전 중단은 duration+180초다.
종료 복구 대조는 양채널 녹화 비활성화→정상 종료→메타데이터/미디어 SHA 저장→
새 PID 복구 대조→재활성화→양채널 신규 finalized→정상 종료 순서다.
설정 revision은 정상 API의 현재값을 조회·대조해 갱신한다. 장시간 루프에서 기존
전체 journal 재읽기를 반복하지 않는다. 단기 인증/비인증/관측 흐름과180초 제한은
그대로 두며, 이번 구현 검증은 순수 단위·CLI 거부·구문 검사에 한정한다.
실제 녹화 전용120분 실행은 별도 승인 전 미실행이다.

OBS32023 이후 장시간 workload 분리 시 주의점: 실제 event tap 입력은
`va_tracking_event_1280x720_30fps_h264.mp4`를 복사한 identity.mp4다.
640×360은 quota 확인용 retention.mp4만 해당하므로 event buffer의 메모리 추산에
사용하지 않는다. `EventFrameBuffer::Record`는 같은 key의 새 프레임 수신 시에만
시간/프레임 수 조건으로 prune하며 static `RecorderFrameBuffer`는 프로세스 수명을
갖는다. tap 제거 자체를 이벤트 프레임 보유량0의 evidence로 삼지 않는다.
장시간 검사에서는 입력/분석 활성 구간과 해제 후 유휴 구간, 누적 catalog metadata,
새 PID 구간을 구분해야 한다. 현재 첫 PID 약416MB 표본만으로 이 버퍼가 전부 원인이라고
단정하지 않으며, buffer 해제·byte cap·제품 정책 변경은 이 관측 설계에 끼워 넣지 않는다.

증분 판독 첫 구현은 관측용 reader에 한정한다. 허용된 테스트 root 내부의 일반 파일을
고정 dev/inode로 확인하고, 완결 LF 다음 byte offset만 소비한다. 미완결 꼬리는 보관해
이어붙이지 않고 다음 poll에서 재읽어 제품의 RepairTail과 충돌하지 않게 한다.
이미 소비한 prefix 아래 잘림·파일 교체·읽기 오류는 명시 오류로 고정하며 자동으로
offset 0으로 되돌아가 정상 집계처럼 이어가지 않는다. 같은 파일을 유지한 앱 재시작은
cursor를 유지할 수 있으나 PID별 자원 계측군은 별도로 나눈다.

reader는 기본 64KiB chunk, poll당 최대4MiB 읽기, 단일행 최대1MiB로 메모리와 일을
제한한다. 상한은 검증 도구의 보호값이지 제품 제한이 아니다. backlog·미완결 bytes와
실제로 소비한 bytes를 분리한다. 지나치게 긴 행은 조용히 건너뛰지 않고 오류로 남긴다.
관측한 mutation envelope의 기본 필드와 알려진7개 type을 확인하되 제품의 strict JSON
중복키 검사·catalog 참조 검증·Apply 성공을 대신한다고 주장하지 않는다.
무잠금으로 읽은 완결행도 fsync 성공 증거는 아니며 내구 판정은 정상 stop 이후의 기존
snapshot 검증으로 유지한다. raw payload를 로그로 출력하지 않는다. 전체 원장이나
무제한 entity Map을 reader 내부에 누적하지 않고 bounded batch를 소비자에게 반환한다.
이 첫 구현과 짧은 실제 임시파일 검사는 장시간 runner 연결·실행·추세 판정과 구분한다.

장시간 연결 전 실제 관측 결합은 별도 `--app-observe` 단기 모드로 준비한다. 기존
비인증 앱 시나리오의 순서·입력·quota·180초 안전 중단·512MiB root 상한을 바꾸지
않고, 현재 서버 PID의 계측값과 원장 증분 배치를 5초 간격으로 함께 기록한다.
최초 원장 생성 전은 미측정으로 표시하고 생성 후 읽기 오류는 정상 빈 원장으로
대체하지 않는다. 재시작 시 PID/startIdentity별 표본군을 분리하며 journal cursor는
같은 파일일 때 유지한다. 부모 검증기의 메모리는 서버 RSS에 합치지 않는다.

관측 집계는 mutation type별 행 수와 고유 mutation/entity 수·ID 저장 바이트를
구분한다. ID 최대100,000개와 UTF-8 ID 저장32MiB 상한을 넘으면 관측 불가로 실패하며
자동 eviction·journal 절삭·기존 quota 상향으로 통과시키지 않는다. 단기 관측 보호값은
제품 제한이나 120분 적정 용량 판정이 아니다. raw payload/source URL/비밀값은
표본 로그에 포함하지 않는다. sampler 오류는 기존 앱의 정상 정리 경로로 전파한다.
목적은 과거 원장 cursor46987의 실제 유형별 증가와 PID별 자원 변화를 연결하는 것이며,
단기 결과를 누수 부재 또는 120분 통과로 해석하지 않는다. 구현·단위 검토 뒤 실제
단기 관측을 수행하고, 그 증거로 장시간 판정 기준과 집계 상한을 검토한다.
정상 서버 종료 뒤의 최종 원장 집계는 backlog와 미완결 꼬리가 모두 없어야 한다.
살아있는 서버의 일시적인 꼬리 대기와 종료 후 불완전 원장을 구분하며, 실패 정리에서도
진행 중인 tick 종료와 reader FD 해제를 보장한다.

### Step 3.4: 이벤트 대기열 키와 재시도 일정 보존 검증

실제 단기 관측27991의 원장46714행 중 event_link_created가46497행이었다.
HTTP dispatch3회는 EventRecord3개를 뜻하지 않으며, 유형별 집계만으로 원인을
확정하지 않는다. 읽기 조사에서 `CatalogEventRecordingBridge::Enqueue`가
대입 우변에서 작업을 이동한 뒤 좌변에서 이동된 `event_id`를 키로 사용함을 확인했다.
이동 후 문자열 값에 의존하면 원래 이벤트 검색과 `preserve_existing_schedule`이
깨져 Refill이 미래 재시도를 현재 시각으로 덮을 수 있다는 단일 가설을 검증한다.

- 실제 Catalog/Bridge의 공개 동작을 사용한 제한 시간 내 focused 재현을 먼저 등록한다.
- 고정 clock에서 재시도 deadline 이전 원장 반복 증가와 서로 다른 이벤트의 일정
  보존을 검사한다. 소스 문자열이나 별도 대기열 복제품만으로 통과하지 않는다.
- 예상된 RED가 가설과 일치할 때만 이동 전 키 보존으로 최소 수정한다.
- timeout·retry 값, 삭제/보존 정책, 원장 schema, 무변경 append 정책은 변경하지 않는다.
- 동일 GREEN과 관련 bridge 회귀를 확인하며, 실제 앱 관측량 감소는 별도 재실행
  전까지 미확인으로 유지한다. focused 통과를 S09 전체 완료로 확대하지 않는다.

### Step 4: 로드맵 상태를 실제 evidence에 맞게 닫는다

- 구현된 단계만 `개발 완료`로 바꾼다.
- 실행하지 않은 UI/30분/120분/field smoke를 `미실행/조건부`로 남긴다.
- v4.2~v4.9 항목은 계획 상태를 유지한다.
- MyLocalLLM/VARuleLens를 통합했다고 쓰지 않고 독립 구현 원칙만 유지한다.
- `main` 반영은 v4.1.0 PR/merge가 별도로 승인·완료될 때 발생한다고 기록한다.

### Step 5: 최종 커밋 가능 상태만 보고한다

모든 승인된 test가 통과하고 evidence, 변경 파일, 영향·회귀, 미실행 항목이 기록된 뒤에만
커밋 가능 상태로 보고한다. 사용자가 이 단계 커밋을 명시 승인한 경우에만:

```bash
git add scripts/internal/verify_v410_recording_foundation.sh scripts/internal/verify_v410_recording_longrun.sh server.sh docs/config-reference.md docs/stream-verification.md docs/project-feature-test-inventory.md docs/release-evidence-v410.md docs/release-evidence-index.md docs/v410-v49-recording-search-roadmap.md docs/development-backlog.md
git commit -m "docs: v4.1 녹화 기반 검증과 evidence 마감"
```

푸시, PR, main merge, tag, GitHub Release, `v4.2.0` 브랜치 생성은 이 계획의 자동 후속
작업이 아니다. 각 action은 사용자 최신 지시의 개별 승인을 받아야 한다.

---

## 전체 완료 조건

### S10-3A 원장 미래 버전 읽기 안전 경계

진행 범위: 원장·catalog의 미지원 schema/type 분류와 시작 거부. 녹화 순서 발급, 시간 매핑
영속화, writer 연결, SQLite schema 변경, V1 data migration은 이 하위 작업에 포함하지 않는다.
기존 정상 V1·손상 행/불완전 tail의 복구는 유지한다. 새로운 정책 source는 설계 명세 S10 절이다.

수정 파일: `include/recording/recording_journal.h`, `src/recording/recording_journal.cpp`,
`src/recording/recording_catalog.cpp`, `scripts/internal/recording_catalog_smoke.cpp`.
출력: replay의 `unsupported_record_count`와 catalog open의 fail-closed 결과.
정상 strict JSON object의 문자열 `schema`가 `media-server.recording-mutation.v1`과 다르거나,
해당 schema에서 문자열 `mutationType`이 미지원이면 unsupported로 분류한다. 원문은 수정하지 않는다.
필드 부재/잘못된 타입/JSON 구문 오류는 기존 손상 분류이며 새 type의 payload를 해석하지 않는다.
읽기 중 unsupported가 하나라도 있으면 SQLite open/rebuild·writer cleanup 전에 catalog open을 거부한다.
이 변경이 예전 바이너리의 downgrade를 막아주는 것은 아니다. store format의 downgrade 차단은 별도 경계다.

- [x] 미래 schema와 미래 type의 replay 분류·catalog 거부·원본 bytes 불변 검사를 먼저 작성한다.
- [x] 기존에 corruption으로 건너뛰어 Open이 성공하는 assertion을 예상 RED로 확인한다.
- [x] 분류·counter와 Open 사전 guard를 구현한다. 기존 V1 의미·payload·삭제 동작을 변경하지 않는다.
- [x] `./server.sh verify-v410-recording-catalog`의 관련 기존 회귀와 신규 검사 GREEN을 확인한다.
- [x] 메인이 실제 diff·결과·원본 보존·cleanup을 검토한다. 커밋·푸시는 실행하지 않는다.

결과: RED 55/20(신규 예상 실패만), GREEN 84/0(C++75+script9). 중앙 기록 S10-3A 절에
전수 결과·정리를 보존했다. S10-3A 한정 구현 완료이며 순서 발급·시간 매핑 저장·실제 writer
시간 수정은 아직 아니다. 메인은 guard 선행성·V1 parser 경계·counter 사용처와 결과를 직접 검토했다.

작업 소유권: 단일 담당자는 위 코드/검사만, 메인은 계획·설계·중앙 결과 기록만 수정한다.
AGENTS.md 1.3에 따라 새 검토 에이전트·하위 에이전트 없이 기존 담당자를 재사용한다.
실제 실패 발생 시 보고·중단하며 예상 RED만 같은 범위에서 구현으로 진행한다.

### S10-3B 영속 순서 예약 저장 API

이번 범위는 `RecordingJournal::ReserveRecordingOrder(store_id, request_id, segment_id,
channel_id, result, error)`와 `RecordingOrderReservationV1`의 저장 계층 구현이다.
결과는 입력 네 ID와 양의 int64 `sequence`다. 모든 ID는 기존 opaque ID 검증을 따른다.
`recording_order_reserved` mutation의 entityId는 segment ID, mutationId는 request ID이며,
payload schema는 `media-server.recording-order.v1`이다. 기존 V1 필드 의미는 바꾸지 않는다.

- 첫 예약이 store ID를 내구적으로 결박한다. 같은 원장의 다른 store ID, 요청/segment 재사용
  충돌, 기존 다른 mutation의 request ID 충돌, 잘못된 예약 payload는 거부한다.
  예약 없이 먼저 finalize/삭제된 V1 segment에 순서를 소급 부여하지 않는다.
- 동일 요청·동일 네 ID는 기존 번호를 반환한다. 새 요청은 원장에 기록된 최댓값 다음 번호를
  발급한다. 번호의 의미는 UTC·finalize 순서가 아니며 INT64_MAX 이후 발급은 거부한다.
  동일 예약 중복을 제외한 기존 발급 순서의 역행도 거부하며 번호 사이 공백은 허용한다.
- inode/parent 검증과 동일 FD의 배타 flock 안에서 전체 읽기·검증·append·fsync를 수행한다.
  다른 인스턴스/프로세스도 같은 잠금을 사용한다. 성공 및 재시도 반환 전에 fsync한다.
- 손상·미지원·불완전 tail 또는 충돌하는 예약이 있으면 원문을 보존하고 거부한다.
  이 경로에서는 기존 Append의 tail repair를 호출하지 않는다. 일반 Append로 예약을 우회할 수 없다.
- catalog는 정상 예약을 읽되 기존 segment/삭제 projection에 새 의미를 넣지 않는다.
  writer/composition root 연결, store migration, downgrade 차단, 시간 매핑은 이번에 활성화하지 않는다.
- 전체 원장 검증 비용은 원장 크기에 비례한다. 우선 정확성 경계를 검증하며 이것을 장기 운영
  성능 PASS로 보고하지 않는다. 실제 활성화 전 원장 성장·쓰기 소유권·구형 binary 접근을 닫아야 한다.
  64KiB chunk로 읽고 record 하나는 16MiB 안전상한을 적용한다. 상한 초과도 원문 보존 후 거부한다.
  충돌 인덱스 메모리는 원장 크기에 비례한다. 기존 일반 Append에 전체 scan을 추가하지 않으며,
  외부/일반 append로 생긴 충돌은 다음 Reserve에서 검출한다. 비협조 writer 차단 완료가 아니다.

검증은 기존 `./server.sh verify-v410-recording-catalog`만 사용한다. 새 API의 컴파일 가능한
거부 stub에서 최초 발급·재시도/재시작·정상 원장 호환·동시 발급 assertion의 예상 RED를 확인한다.
기존 회귀/빌드/환경 오류는 예상 RED가 아니다. 중앙 S10-3B 사전등록의 오류 경계도 GREEN에 포함한다.
코드 네 파일은 기존 담당자 소유, 문서/최종 검토는 메인 소유다. 하위 생성·커밋·푸시·S10-3C 착수는 금지한다.

| 런타임 패밀리 | 담당 | 추천 모델 | 추론 수준 | 선정 근거 |
| --- | --- | --- | --- | --- |
| Codex | 단일 기존 서브에이전트 | gpt-6-astra | medium 유지 | 영향2/불확실성1/검증2/범위1=6. 저장 원자성의 확정 구현이며 메인이 안전 계약·결과를 검토한다. 상향/추가 생성 없음; 실행 설정 변경 없음 |

- [x] 사전등록·예상 RED 확인
- [x] 저장 API 및 catalog 호환 구현·GREEN
- [x] 실제 diff·개별 결과·cleanup 대조와 한정 완료 보고

저장 API 한정 결과: RED 두 회 모두 113/13(새 양성13만 예상 실패), GREEN135/0 후
기존 계약의 독립 경계4개를 보강한 최종139/0(C++130+shell9). 제품 코드는 GREEN 이후
변경하지 않았다. 개별 결과·이력·cleanup은 중앙 테스트 기록 S10-3B 절에 보존한다.
메인은 same-FD 잠금, strict payload/envelope 결박, 단조 발급·ID 충돌, fsync 뒤 결과 반환,
기존 Append 비용 유지와 실제 테스트를 직접 대조했다. 이번 변경은 위 코드 네 파일 및 관련
기존 문서에 한정한다. 커밋·푸시는 미수행이다. 실제 writer 활성화와 S10-3C는 미완료다.

### S10-3C 세그먼트 시간 계약과 finalize 복구 결합

2026-09-12 사용자 「커밋 후 S10-3C 진행」 승인. A/B는 각각 `a82f4d21`, `15f2753e`로
분리 커밋했다. 이전 S09·S10-1/2의 미커밋 변경은 보존하고 이 커밋에 섞지 않았다.
이후 사용자 「C2~C3까지 마무리·진행 중 커밋·마지막 푸시」 승인으로 의존 C1과 C2/C3를
각각 검증·분리 커밋하고 마지막에 푸시한다. S11·릴리즈 작업은 포함하지 않는다.
이번에는 저장 계약→catalog→ready 복구 순서로 구현하며 실제 writer·조회 UI·이벤트 소비자 활성화는 하지 않는다.

#### C1: 새 시간 계약 (먼저 구현)

기존 contracts header/cpp와 `recording_contract_smoke.cpp`를 사용한다. V1 함수·golden은 그대로 둔다.
`RecordingSegmentV2`의 schema는 `media-server.recording-segment.v2`이며 아래 필드를 snake_case로 저장한다.

- ID: segment_id/source_id/channel_id/store_id/order_request_id/media_epoch_id. 기존 opaque ID 검증을 적용한다.
- order_sequence: 양의 int64. media_start_pts: int64, media_end_pts: nullable int64.
  time_base_num/time_base_den: 양의 int32. 알려진 media_end_pts는 start보다 커야 한다.
- container/video_codecs/audio_codecs/audio_omitted_reason/size_bytes/checksum_sha256/
  retention_class/lifecycle/pinned/created_at_ms/finalized_at_ms는 V1과 같은 물리/운영 의미다.
  UTC start/end 또는 V1 stream_epoch_id를 억지로 생성하지 않는다. lifecycle은 이번 저장 계약에서 Finalized만 허용한다.
  V2 retention_class는 continuous/event만 허용하며 V1의 기존 enum 해석은 변경하지 않는다.
- mappings: `RecordingUtcMappingV1` 배열. 각 항목의 schema는 `media-server.recording-utc-mapping.v1`.
  mapping_id, start_pts, nullable end_pts, provenance, nullable utc_start_ns/utc_end_ns,
  nullable uncertainty_ns, reason을 필수 키로 둔다.
- provenance는 source-capture/server-observation/estimated/unknown만 허용한다. known은 양쪽 UTC와
  media 끝이 모두 있고 각 범위가 증가하며 uncertainty_ns>=0이어야 한다. estimated는 비어 있지 않은 reason이 필요하다.
  unknown은 UTC·uncertainty를 모두 null로 두고 비어 있지 않은 reason을 저장한다. 실제 epoch UTC 0은 unknown 대용이 아니다.
- media 구간은 처음부터 끝까지 빠짐없이 서로 인접한 mapping으로 덮는다. 중복 mapping_id·미디어 겹침·빈 배열은 거부한다.
  끝이 불명확한 경우 마지막 mapping만 unknown/end_pts=null이고 media_end_pts도 null이어야 한다.
  서로 다른 mapping의 UTC는 중복/역행할 수 있다. 저장 시 재계산하거나 단조 보정하지 않는다.
- 최대256개 mapping, reason 최대256 bytes, 전체 JSON 최대1MiB. 상한 초과는 명시 거부하고
  writer가 unknown tail로 묶을 정책을 임의 생성하지 않는다. parser는 알려진 정확한 키/타입을 검증하고 결과를 성공 시에만 대입한다.

공개 함수: ValidateRecordingSegmentV2/SerializeRecordingSegmentV2/ParseRecordingSegmentV2.
Serialize 결과에서 입력 정수·null·provenance를 보존한다. V2를 V1으로 반환하는 adapter는 만들지 않는다.
검증 명령: `./server.sh verify-v410-recording-contracts`. 선언·reject stub에서 새 정상 V2 수용의
예상 RED를 먼저 확인하며 기존 V1 실패는 중단한다. 이후 같은 명령 GREEN과 개별 결과를 기록한다.

#### C2/C3 연결 책임

catalog 저장 옵션 `enable_v2_storage`는 기본 false다. true는 이번 격리 검증에서만 사용하고
실제 composition root에는 연결하지 않는다. false에서 V2 원장/ready를 만나면 부분 복구하지 않고 거부한다.
이 절의 저장 계약이 V2 실제 녹화 활성화를 의미하지 않는다.

#### C2: catalog의 불변 V2 저장

- 기존 journal에 `SegmentV2Finalized`/`segment_v2_finalized`를 추가한다. payload는
  `segment`(전체 V2)와 `mediaRelpath`이며 envelope entityId=segment_id다. 단일 mutation에 같이 보존한다.
- catalog 공개 내부 API는 FinalizeSegmentV2(segment, media_path, error), FindSegmentV2ById(id),
  ValidateFinalizeRecoveryV2(segment, media_path, error), RecoverFinalizedSegmentV2(segment, media_path, inserted, error)다.
  예약 확인은 읽기만 수행한다. 없으면 예약을 새로 발급하지 않으며 store/request/segment/channel/sequence가 모두 같아야 한다.
- V1/V2 ID는 같은 namespace다. 상호 충돌·tombstone·경로 및 불변 metadata 불일치는 거부한다.
  동일 V2 replay/recovery는 멱등이며 finalize 때 다른 mapping으로 덮어쓰지 않는다.
- V2 projection은 별도 `recording_segments_v2(segment_id PRIMARY KEY,payload_json,media_relpath)`에
  정규 JSON 전체를 저장한다. V1 UTC 열에 대체값을 넣지 않는다. journal 재구축에서 메모리가 수용한
  동일 ordinal/envelope만 투영하고 직접 SQL의 JSON/path와 in-memory 결과를 대조한다.
- V2 신규 mutation은 전체 envelope/예약/기존 identity를 검증한 뒤 수용한다. 잘못된 V2 기록은
  catalog Open에서 SQLite 변경·cleanup 전에 거부한다. V1의 기존 손상 복구 정책은 완화/확대하지 않는다.
  Open 사전 검사는 임시 상태로 수행하여 실패 후 Open 재시도가 부분 메모리를 수용하지 않게 한다.
  V2 옵션 true 또는 정상 order reservation/V2 record가 있는 원장에 손상/tail이 있으면 시작을 거부한다.
  일반 V1-only 원장의 기존 손상 복구는 유지한다. V2 payload는 Replay에서 잃어버리지 말고 catalog가 검증한다.
- 예약 이후의 V2 finalize는 journal 순서 발급 scan에서 기존 segment 상태로 취급한다.
  catalog가 열린 뒤 발급된 예약도 fresh replay로 읽되, 파일 검사/append와 store 전체 다중 writer 소유권은
  실제 활성화 전 경계다. 비협력 writer와의 완전 직렬화 완료로 보고하지 않는다.
- V2 Find는 tombstone ID를 숨긴다. V1 tombstone/삭제 기록을 보존하고 V2와 ID 충돌 시 부활시키지 않는다.
  V2를 V1 QuerySegments/retention/분석 locator에 추가하지 않는다. 새 삭제 producer는 소비자 연결 단계다.
  orphan 인식에는 V2의 실제 등록 경로를 포함하여 이미 등록된 파일을 미등록 파일로 분류하지 않는다.

#### C3: ready의 버전 분기

- 기존 FinalizeReadyTicket에 optional segment_v2를 추가한다. 기존 segment와 동시에 지정하면 거부한다.
  version=1 직렬화/검증은 유지한다. version=2는 segment에 V2 전체를 담고 기존 partial/final/eventLink 키를 유지한다.
- V2 ready는 continuous만 이번 복구 경로로 받는다(eventLink=null). 기존 event V1 ready는 그대로 유지한다.
  V2 event 파생 provenance/hold는 이벤트 소비자 연결 때까지 명시 거부하며 자동 V1 변환하지 않는다.
- same directory, nonce, filename/ID/container, nlink/nofollow, 원문 보존/정리 경계는 V1과 같다.
  매핑·순서·reservation·tombstone·기존 ID/path를 publish 전에 검증한다. V2 옵션 false이면 publish 전에 거부한다.
- catalog 인자가 없는 기존 PublishFinalizeReady는 V1 진입점으로 유지하고 V2 직접 호출은 거부한다.
  V2 publish는 RecoverFinalizeReadyTickets의 catalog 검증 이후 내부 경로에서만 허용한다.
  ready 작성은 최종 공개가 아니며, 예약이 없는 ticket을 복구하면서 새 순서를 발급하지 않는다.
- 실제 미디어 검사는 공통 물리 descriptor(container/codecs/bytes/SHA/retention)만 사용하도록 내부 분리한다.
  V1 inspector API는 wrapper로 유지하며 V2에 가짜 V1 UTC를 만들어 전달하지 않는다.
- V2의 중단된 두 link는 검사 전에 partial을 제거하지 않는다. inspector의 새 내부 물리 검사 경로에서만
  정확한 같은 디렉터리의 서로 다른 두 이름·동일 regular inode·nlink=2를 전후 확인한다.
  임의 hardlink 허용 옵션으로 일반 V1 검사를 완화하지 않는다. Healthy와 두 이름의 binding 재확인 뒤에만
  partial 이름을 정리한다. 손상/검사불가이면 두 이름과 ready를 그대로 보존한다.
- 전체 ready envelope도 최대1MiB다. segment만 한도 이내여도 경로·envelope를 합쳐 초과하면
  파일 생성 전에 거부한다. V1 직렬화는 바꾸지 않는다.
- partial만 존재/중단된 두 link/final만 존재/원장 commit 뒤 ready 잔존을 복구하고 같은 V2를 복원한다.
  이미 commit된 metadata와 ticket이 다르거나 미디어가 손상/검사불가이면 파일·ready를 보존하고 실패한다.
  V2 손상의 기존 V1 corruption/provenance 모델로의 자동 격리 변환은 하지 않는다.
  원장 commit 뒤 동일 ticket을 확인한 경우에만 기존 marker/ready 정리를 수행한다.

최종 합격은 같은 V2 원문 의미가 ready→journal→SQLite/JSONL 재시작에서 보존되고,
충돌·누락·삭제 ID는 publish/ready 제거 전에 거부되는 것이다. 시간 없는 V1 투영은 금지한다.
등록/실행은 중앙 S10-3C 기록을 따른다. contracts, catalog, finalize-recovery의 focused만 승인 범위이며
whole build·integration 옵션·30분/120분/UI·C 이후 단계는 이번 실행 범위 밖이다.

| 런타임 패밀리 | 담당 | 추천 모델 | 추론 수준 | 선정 근거 |
| --- | --- | --- | --- | --- |
| Codex | 메인 설계·검토, 기존 단일 담당자 구현 | gpt-6-astra | medium 유지 | 영향2/불확실성2/검증2/범위2=8. 시간·저장·복구 계약을 메인이 고정하며 구현을 순차 위임. 자동 상향·하위 생성 없음 |

- [x] C1 계약·V1 golden 회귀: focused 최종135/0. V1 89개 유지, 새 V2 46개.
  최초 정상 수용 RED 5개와 검토 후 Unknown retention RED 2개를 각각 기록하고 보완했다.
  전수 결과·실패 이력·임시5경로 삭제는 중앙 테스트 기록의 S10-3C/C1 절에 보존했다.
- [x] C2 원장·catalog·SQLite 동등성: 최종172/0(기존139개 포함).
  예약 검증 공유, 별도 V2 투영, 최신 원장 후보 대조·실제 파일 존재와 삭제/충돌 경계를 구현했다.
  메인이 실제 diff 및 중앙 C2 전수 결과를 대조했다. V2 실제 writer 활성화는 하지 않았다.
- [ ] C3 ready 복구·삭제/충돌 보존 및 관련 회귀

C2 첫 구현 후 담당자 도구 분류 오류로 중단했던 이력은 중앙 기록에 보존했다.
새 승인으로 재개하여 미해소 두 경계와 전수 결과 이관을 마쳤다. C3는 다음 구현 대상이다.

v4.1.0 개발 완료는 다음이 모두 참일 때만 성립한다.

1. channel opt-in recorder가 client 유무와 무관하게 source를 유지하고 불변 segment를
   계속 만든다.
2. quota 초과와 reserve 부족에서 oldest eligible continuous를 지운 뒤 녹화를 계속한다.
3. event clip은 별도 quota로 보호되고, 파생 중 source segment도 retention에서 보호된다.
4. event clip/fallback이 logical timeline에서 continuous보다 먼저 표출·재생된다.
5. journal만으로 SQLite/in-memory projection을 idempotent하게 재구축할 수 있다.
6. crash, deletion_pending, orphan, corrupt media/catalog가 fail-closed 상태로 수렴한다.
7. event/track boundary·summary와 bounded observation이 정확한 FrameLocator를 가진다.
8. v4.1 golden fixture와 contract 의미를 후속 버전이 수정하지 않도록 gate가 존재한다.
9. 관련 기능별 test, 문서/evidence, `git diff --check`가 모두 갖춰진다.
10. 미실행 UI/30분/120분/field smoke와 release action을 완료로 오인하지 않는다.

## 실행 handoff

실행자는 한 번에 한 roadmap 단계만 진행하고 매 단계 종료 시 다음을 보고한다.

- 구현한 파일·route·함수·module·UI control·API·verifier
- focused test 명령과 실제 exit code
- 실패/수정/재검증 이력
- 변경 파일, 영향 범위, 회귀 가능성
- 미실행·조건부 test
- 커밋 가능 여부와 실제 커밋 미수행/수행 여부
- 푸시 가능 여부
