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
- 각 단계의 focused test를 먼저 실패시키고, 해당 단계 범위만 구현한 뒤 다시 통과시킨다.
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
| `MEDIA_SERVER_RECORDING_ROOT` | `.media_server.recordings` | 영상·journal·catalog root |
| `MEDIA_SERVER_RECORDING_SEGMENT_DURATION_MS` | `10000` | 목표 segment 길이. 실제 분할은 다음 keyframe까지 연장 가능 |
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
- 수정: `docs/http-api.md`
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

projector key는 `{channel_id, track_id, stream_epoch_id}`다.

- 첫 confirmed/tentative track: start observation
- configured interval 경과: representative observation
- event-triggered detection: immediate observation
- terminated track: end observation과 first/last/duration/class/confidence 요약
- process/channel stop: `endedReason=stream-stopped`로 열린 track summary flush

동일 PTS에 여러 사유가 겹치면 하나만 저장하고 selection reason 배열에 모두 기록한다.
queue가 가득 차면 interval observation을 먼저 drop하고 start/event/end는 보존한다. drop
count와 마지막 오류를 status에 노출한다.

### Step 4: FrameLocator를 catalog로 해석한다

PTS와 stream epoch가 포함된 finalized segment를 찾고 keyframe anchor를 기록한다. 아직
writing인 segment의 observation은 pending queue에 두었다가 finalize callback에서 resolve한다.
segment가 corrupt/deleted면 observation은 남길 수 있지만 `frameLocator=null`과 reason을
기록한다.

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

복구는 journal replay를 먼저 수행하고 filesystem scan을 대조한다. `.partial`은 container
검사가 안전하게 완료 가능한 경우에만 새 ID로 publish하고, 아니면 `corrupt` record와
격리 경로만 남긴다. final orphan은 checksum/container/range를 검증한 뒤 recovered
mutation을 쓴다.

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

**수정 파일:**

- 생성: `scripts/internal/verify_v410_recording_foundation.sh`
- 생성: `scripts/internal/verify_v410_recording_longrun.sh`
- 수정: `server.sh`
- 수정: `docs/config-reference.md`
- 수정: `docs/http-api.md`
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

### Step 2: 테스트 필요성 판정표를 먼저 작성한다

AGENTS.md 7.6.2 기준으로 다음을 분리한다.

| 카테고리 | 예상 판정 | 실행 전 조건 |
| --- | --- | --- |
| build/static/focused | 필수 | 각 단계 구현 승인 범위 |
| UI 풀테스트 | 필수 후보 | `/ops/events` 실제 조작과 재생 UI가 추가되므로 사용자 실행 승인 필요 |
| 30분 | 필수 후보 | 연속 writer·retention·reconnect 장기 동작이므로 사용자 실행 승인 필요 |
| 120분 | 조건부 | memory/thread/fd 증가 신호 또는 release policy 명시 시 사용자 승인 후 실행 |
| 외부 RTSP/ONVIF | 조건부 미실행 | endpoint/credential/실기기와 별도 승인 필요 |

실제 판정은 구현 diff와 선수 test 결과를 근거로 다시 작성하며, 이 표를 실행 PASS로
사용하지 않는다.

### Step 3: 승인된 범위의 안정화만 실행한다

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
git add scripts/internal/verify_v410_recording_foundation.sh scripts/internal/verify_v410_recording_longrun.sh server.sh docs/config-reference.md docs/http-api.md docs/stream-verification.md docs/project-feature-test-inventory.md docs/release-evidence-v410.md docs/release-evidence-index.md docs/v410-v49-recording-search-roadmap.md docs/development-backlog.md
git commit -m "docs: v4.1 녹화 기반 검증과 evidence 마감"
```

푸시, PR, main merge, tag, GitHub Release, `v4.2.0` 브랜치 생성은 이 계획의 자동 후속
작업이 아니다. 각 action은 사용자 최신 지시의 개별 승인을 받아야 한다.

---

## 전체 완료 조건

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
