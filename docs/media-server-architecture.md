# Media Server Architecture (MVP -> Extensible, C++)

## 1. 목표
- 지원 OS: macOS, Linux
- 현재 지원:
  - Client ingress/egress: RTSP, WebRTC HTTP signaling, WHEP
  - Source: File, RTSP Pull, WebRTC WHIP publish source, HTTP/HLS URI source 1차 경로
  - Egress: RTSP, WebRTC
- 미래 확장:
  - YouTube live/uploaded URL 처리를 위한 HLS/HTTP source adapter 추가
  - 운영용 WebRTC auth / STUN / TURN / ICE policy 추가
  - 영상 분석 pipeline 추가
- 핵심 요구:
  - 동일 소스에 대한 다중 클라이언트 요청 시 Source Pull 1회 + N-way fan-out
  - 서로 다른 N개의 요청을 동시에 안정적으로 처리

## 2. 전체 구성
```text
Player (RTSP/WebRTC)
      |
      v
Ingress Adapter (RTSP now, WebRTC later)
      |
      v
Session Manager ---- Resource Guard ---- Metrics
      |
      v
Stream Registry (dedup by StreamKey)
      |
      v
SharedStream
  - Single Source Reader (1)
  - Packet Bus / Fan-out
  - Subscriber Queues (N)
      |
      v
Egress Adapter (RTSP now, WebRTC later)
```

이 구조를 연결 관점에서 다시 쓰면 아래와 같다.

```text
Client <-> (RTSP or WebRTC) <-> MediaServer <-> (File or RTSP or WebRTC) <-> Original Source
```

중요한 점:
- `Client -> MediaServer` 구간과 `MediaServer -> Original Source` 구간은 독립적으로 결정된다.
- 앞단은 `egress protocol`, 뒷단은 `source protocol`이다.
- 요청 URL/endpoint와 query/source 파라미터 조합으로 두 구간을 각각 선택한다.

### 2.1 프로토콜 선택 규칙

| 구간 | 의미 | 결정 방식 | 값 |
| --- | --- | --- | --- |
| `Client -> MediaServer` | egress protocol | RTSP URL 또는 WebRTC HTTP endpoint | `RTSP`, `WebRTC` |
| `MediaServer -> Original Source` | source protocol | `file`, `url`, `source` 파라미터 | `file`, `RTSP`, `WebRTC` |

예시:
- `rtsp://127.0.0.1:8554/dhseo?file=sample_h264.mp4`
  - egress: `RTSP`
  - source: `file`
- `rtsp://127.0.0.1:8554/dhseo?url=rtsp%3A%2F%2Fcamera-host%3A554%2Flive`
  - egress: `RTSP`
  - source: `RTSP`
- `POST /webrtc/session?source=webrtc&url=publisher-demo`
  - egress: `WebRTC`
  - source: `WebRTC`

## 3. 핵심 개념

### 3.1 StreamKey
- 동일한 소스 요청인지 판별하는 정규화 키.
- 예:
  - `rtsp://cam/a?b=1&c=2`와 `rtsp://cam/a?c=2&b=1`는 같은 키
  - file path는 절대경로/심볼릭링크/대소문자 정책을 정한 뒤 canonicalize

### 3.2 SharedStream
- 한 개의 실제 Source 연결만 유지.
- Reader goroutine 1개가 패킷을 읽고 PacketBus를 통해 다중 구독자에 배포.
- 구독자 추가/해제는 런타임에 동적으로 수행.

### 3.3 Subscriber Backpressure
- 느린 클라이언트가 전체 스트림을 막지 않도록 정책 필요:
  - 기본: `drop-oldest` (실시간성 우선)
  - 대안: 제한 초과 시 subscriber disconnect

## 4. 디렉터리 구조 제안 (C++ 기준)
```text
include/
  stdafx.h                 # configurable constants (route path etc.)
  media_types.h
  core/
    resource_guard.h
    session_manager.h
    stream_key.h
    shared_stream.h
    stream_registry.h
  ingress/
    gstreamer_rtsp_server.h
    request_parser.h
    rtsp_adapter.h
    webrtc_gst_utils.h
src/
  main.cpp
  core/
    resource_guard.cpp
    session_manager.cpp
    shared_stream.cpp
    stream_registry.cpp
    stream_key.cpp
  ingress/
    gstreamer_rtsp_server.cpp
    request_parser.cpp
    rtsp_adapter.cpp
    webrtc_gst_utils.cpp
CMakeLists.txt
```

## 5. 인터페이스 명세 (초안)

### 5.1 Ingress (C++ 예시)
```cpp
struct IngressRequest {
    std::string protocol;
    std::string path;
    std::unordered_map<std::string, std::string> query;
    std::string client_id;
};
std::optional<SourceSpec> ParseSourceSpec(const IngressRequest& request);
```

### 5.2 Source
```cpp
struct SourceSpec {
    enum class Kind { Rtsp, File, WebRtc, Hls, Http, Youtube };
    Kind kind;
    std::string uri;
};
```

`Youtube`는 직접 media source라기보다 resolver 역할로 둔다. 즉 `YouTubeResolver`가 watch/live URL을 권한과 정책을 확인한 뒤 재생 가능한 `Hls` 또는 `Http` source로 변환하고, 실제 packet 수집은 `HlsSourceWorker`/`HttpSourceWorker`가 담당한다.

### 5.3 SharedStream fan-out
```cpp
class SharedStream {
public:
    using SubscriberCallback = std::function<void(const Packet&)>;
    bool AddSubscriber(const std::string& session_id, SubscriberCallback callback);
    void RemoveSubscriber(const std::string& session_id);
    void FanOut(const Packet& packet) const;
    std::size_t RefCount() const;
};
```

### 5.4 Stream Registry
```cpp
class StreamRegistry {
public:
    struct AcquireResult {
        std::shared_ptr<SharedStream> stream;
        bool created;
    };
    AcquireResult Acquire(const StreamKey& key, const SourceSpec& source_spec);
    bool TryRemoveIfIdle(const StreamKey& key);
};
```

### 5.5 설정 포인트
- `include/stdafx.h`:
  - `app_config::kStreamRoute` 기본값 `"dhseo"`
  - `app_config::kIdleGracePeriodMs` 기본값 `10000`
  - `app_config::kMaxSessions`, `app_config::kMaxStreams`로 동시 처리 제한
  - 이 값을 바꾸면 지원 경로도 `/새값`으로 변경됨

## 6. 요청 흐름
1. 클라이언트가 RTSP로 `/dhseo?url=...` 또는 `/dhseo?file=...` 요청.
2. Ingress Parser가 `SourceSpec` 생성 후 `StreamKey` 정규화.
3. `ResourceGuard.AdmitNewSession`.
4. `StreamRegistry.Acquire(key, spec)`:
   - 기존 SharedStream 존재: 구독만 추가
   - 미존재: Source 1회 Open + Reader 루프 시작
5. Session마다 Egress 인스턴스 생성 후 SharedStream 구독.
6. Session 종료 시 구독 해제 + ref count 감소.
7. ref count 0이면 `idle-grace-period` 후 SharedStream 종료.

현재 구현에서 이 흐름은 RTSP와 WebRTC를 아래처럼 해석한다.
- RTSP egress:
  - `rtsp://{address}:{port}/{route}?file=...`
  - `rtsp://{address}:{port}/{route}?url=...`
  - `rtsp://{address}:{port}/{route}?source=webrtc&url=...`
- WebRTC egress:
  - `POST /webrtc/session?file=...`
  - `POST /webrtc/session?url=...`
  - `POST /webrtc/session?source=webrtc&url=...`
  - `POST /whep?...`

## 7. 동시성 모델
- SharedStream 당 thread:
  - Reader 1개: Source -> PacketBus
  - Fan-out 1개(또는 sharded): PacketBus -> subscriber queue
  - subscriber writer N개: queue -> Egress.WritePacket
- Registry:
  - `std::mutex` + 짧은 임계구역
  - Acquire/Release는 짧은 임계구역 유지
- 데이터 경쟁 방지:
  - subscriber map 변경은 `std::shared_mutex`로 보호
  - packet payload는 immutable 취급 (필요시 copy-on-write)

## 8. 버퍼/품질 정책 (MVP 기본값)
- `subscriber_queue_size`: 256 packets
- queue full 시: oldest drop + drop counter 증가
- `keyframe_cache`: 최근 1 GOP (신규 구독자 fast-start 목적)
- `idle_grace_period`: 10s

## 9. URL 규칙 (현행 + 확장)
- 현행:
  - `rtsp://{address}:{port}/dhseo?url={rtsp_url}`
  - `rtsp://{address}:{port}/dhseo?file={filename}`
- 권장 확장:
  - `source` 파라미터 도입: `source=rtsp|file|webrtc`
  - 내부 canonicalization 함수로 StreamKey 강제 통일

## 10. 실패 처리 원칙
- Source read error:
  - SharedStream 레벨 재연결(backoff) 정책 적용
  - 재연결 실패 누적 시 stream 종료 + subscriber에게 종료 통지
- Subscriber write error:
  - 해당 subscriber만 제거
- 한 subscriber 장애가 다른 subscriber나 Source loop를 중단시키면 안 됨

## 11. 관측성 (최소)
- 메트릭:
  - active_streams
  - active_sessions
  - source_reconnect_total
  - subscriber_drop_packets_total
  - per-stream bitrate/fps
- 로그:
  - session create/close
  - stream acquire/release
  - source reconnect/failure

## 12. 단계별 구현 계획
1. `StreamKey` canonicalization + parser 정의
2. `StreamRegistry + SharedStream` 구현 (dedup + queue/drop-oldest fan-out)
3. RTSP ingress/egress 연결 (실제 라이브러리 연동)
4. file/rtsp source adapter 구현
5. ResourceGuard + metrics 적용
6. WebRTC ingress/egress/source를 동일 인터페이스로 추가
7. `Hls/Http SourceWorker` 추가 및 실험실 `YouTubeResolver` 경로 분리
8. 영상 분석용 `analysis subscriber/tap` 추가

## 12.1 HTTP/HLS source와 실험실 YouTube source

현재 기본 확장 방향은 `source=http|hls`이며, YouTube watch/live URL은 실험실 기능으로만 유지한다. YouTube watch/live URL은 직접 media URL이 아니므로 서버 내부에서는 아래처럼 분리한다.

```text
YouTube watch/live URL
    |
    v
YouTubeResolver
    |
    v
HLS/HTTP playable URL
    |
    v
HlsSourceWorker / HttpSourceWorker
    |
    v
SharedStream
```

구현 원칙:
- 기본 source protocol은 `source=hls` 또는 `source=http`로 먼저 연다. 현재 1차 `UriSourceWorker`는 GStreamer `uridecodebin`으로 HTTP/HLS media URL을 수신한 뒤 내부 표준 패킷(`H264` video, `AAC` audio)으로 재인코딩한다.
- `source=youtube`는 `yt-dlp` 기반 resolver를 통과하는 실험실 옵션으로 두고, 기본값으로는 숨긴다.
- resolver는 YouTube watch/live URL을 HLS/HTTP playable URL로 변환하고, 실제 packet 수집은 기존 `UriSourceWorker`가 담당한다.
- 라이브와 업로드된 영상 모두 고려한다.
- YouTube 약관/권한 이슈가 있으므로 resolver는 실험/권한 확인 가능한 경로로 격리하고, `MEDIA_SERVER_ENABLE_EXPERIMENTAL_YOUTUBE_SOURCE=1`일 때만 노출한다.
- 동일 YouTube URL을 여러 클라이언트가 요청하면 원본 YouTube URL을 stream key로 사용해 하나의 `SharedStream`으로 fan-out한다.
- 실행 중 delegate URI source가 중단되면 원본 YouTube URL을 다시 resolve해서 서명 URL 만료나 일시적인 HLS 중단을 복구하려고 시도한다.
- HLS/HTTP source는 video-only stream도 처리할 수 있어야 하며, RTSP/WebRTC egress의 대표적인 audio 필수 가정은 완화했다.
- RTSP egress는 route별 audio branch를 유지하므로 source audio가 없는 video-only 입력에는 짧은 silent audio priming을 합성한다.
- WebRTC egress는 브라우저 H264 협상 호환성을 위해 video를 720p/30fps로 정규화한다. RTSP egress는 route별 codec 변환 정책을 따른다.

예상 URL:
- `rtsp://{address}:{port}/{route}?source=hls&url={urlencoded_m3u8_url}`
- `POST /webrtc/session?source=hls&url={urlencoded_m3u8_url}`
- `POST /whep?source=hls&url={urlencoded_m3u8_url}`
- 실험실 opt-in 시에만:
  - `rtsp://{address}:{port}/{route}?source=youtube&url={urlencoded_youtube_watch_or_live_url}`
  - `POST /webrtc/session?source=youtube&url={urlencoded_youtube_watch_or_live_url}`
  - `POST /whep?source=youtube&url={urlencoded_youtube_watch_or_live_url}`

## 12.2 다음 확장: 영상 분석 계층

현재 다음 주요 단계는 MediaServer 안에 영상 분석 계층을 추가하는 것이다. 이때 분석 로직은 relay 경로를 직접 대체하는 것이 아니라, `SharedStream`을 구독하는 별도 처리 경로로 붙이는 것이 맞다.

권장 구조:

```text
Original Source
    |
    v
SourceWorker
    |
    v
SharedStream
    | \
    |  \-> Analysis Pipeline
    |       - object detection
    |       - tracking
    |       - event extraction
    |       - snapshot / crop image
    |
    +----> RTSP Egress
    |
    +----> WebRTC Egress
```

분석 계층의 출력 타입:
- `metadata`
  - detection box, class, score, timestamp
- `derived image`
  - JPEG snapshot, thumbnail, crop image
- `rendered stream`
  - overlay가 그려진 별도 video stream

클라이언트 전달 방식 후보:
- 기존 RTSP/WebRTC 영상 위에 overlay를 그린 2차 스트림 제공
- 별도 HTTP endpoint로 snapshot 이미지 제공
- WebRTC data channel 또는 별도 API로 metadata 제공

이 원칙을 두는 이유:
- source 수집과 분석 로직을 분리해야 기본 relay 경로를 안정적으로 유지할 수 있다.
- 같은 `SharedStream`에서 `relay subscriber`와 `analysis subscriber`를 동시에 붙일 수 있다.
- 이후 객체 감지 모델 교체, snapshot 정책 추가, 이벤트 API 추가가 쉬워진다.

## 13. 라이브러리 선택
- `live555`: Linux/macOS/Windows 모두 사용 가능. RTSP 서버/클라이언트에 집중된 경량 라이브러리.
- `GStreamer`: Linux/macOS/Windows 모두 사용 가능. RTSP + 트랜스코딩 + WebRTC 확장까지 한 스택으로 가져가기 쉬움.
- 본 프로젝트는 확장성을 위해 `GStreamer` 기준으로 진행.
- 빌드:
  - 기본: `cmake -S . -B build && cmake --build build`
  - GStreamer ON: `cmake -S . -B build -DMEDIA_SERVER_USE_GSTREAMER=ON && cmake --build build`

## 14. GStreamer RTSP 동적 요청 (현재 구현)
- 요청 형식:
  - `rtsp://{address}:8554/{route}?url={urlencoded_rtsp_url}`
  - `rtsp://{address}:8554/{route}?file={urlencoded_file_path}`
- 동작:
  - `gen-key`를 SourceSpec 기반으로 생성해 동일 소스 요청은 같은 RTSP media를 공유
  - `media-configure` 시점에 query를 파싱해 SourceSpec 생성
  - `SessionManager`로 세션 admission 수행
  - 파이프라인의 `uridecodebin(name=src)`에 동적으로 `uri` 설정
  - media unprepared 시 세션 teardown
- 주의:
  - `url`/`file`는 하나만 지정해야 함
  - query value는 URL 인코딩 권장
  - 현재는 `uridecodebin -> videoconvert -> x264enc -> rtph264pay` 경로로 동작

## 15. 실행 스크립트 / 설정 위치
- 실행:
  - `./scripts/install_deps.sh` (macOS/Linux 의존성 설치)
- `./scripts/start_server.sh` (configure + build + background start, macOS는 launchctl 우선)
- `./scripts/stop_server.sh` (pid 파일 기반 stop)
- `./scripts/restart_server.sh` (stop + start + check)
- `./scripts/check_server.sh` (mode/pid/listen/probe/log 진단)
- `./scripts/diagnose_media_server.sh` (실행환경 진단: 설정/포트/로그/ffprobe 확인)
- `./scripts/auto_start_server.sh` (포트/주소 후보 + 자동 진단 + 자동 재시도)
- `scripts/.media_server.env` (환경별 오버라이드 값 저장 파일, start_server가 자동 로드)
- 실행 상태 파일:
  - pid: `.media_server.pid`
  - port: `.media_server.port`
  - address: `.media_server.address`
  - log: `.media_server.log`
- `start_server.sh` 실행환경 보정:
  - `MEDIA_SERVER_PORT_CANDIDATES`: 포트 대체 시도 목록 (예: `8554,8555,8556`)
- `MEDIA_SERVER_LISTEN_ADDRESS`: 단일 바인드 주소 override
- `MEDIA_SERVER_LISTEN_ADDRESS_CANDIDATES`: 주소 대체 시도 목록 (예: `127.0.0.1,0.0.0.0`)
- `MEDIA_SERVER_BUILD_DIR`: 빌드 디렉터리 override
- `MEDIA_SERVER_BIN_PATH`: 실행 바이너리 경로 override
- `MEDIA_SERVER_SKIP_ENV_CHECK=1`: pkg-config 의존성 점검을 생략해야 할 때 사용
- `MEDIA_SERVER_FORCE_RTSP_TCP=1`: GStreamer가 고정 UDP/랜덤 포트 바인딩에서 실패할 때 TCP-only로 강제
- `MEDIA_SERVER_GST_ATTACH_CONTEXT=default|1`: gstreamer attach 시 기본 GLib context 강제 사용
- `MEDIA_SERVER_WEBRTC_TRACE=1`: WebRTC 협상/상태/RTCP workaround 로그 출력
- `MEDIA_SERVER_WEBRTC_TRACE_VERBOSE=1`: sample/pad/caps/SDP detail 로그까지 출력
- 주요 설정(컴파일 타임):
  - `include/stdafx.h`
  - `kStreamRoute`: RTSP 경로 (`/dhseo`)
  - `kRtspListenPort`: listen 포트
  - `kDefaultFilePath`: 테스트용 기본 파일 경로
