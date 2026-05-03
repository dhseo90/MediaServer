# Media Server Architecture

이 문서는 MediaServer의 서버 구조와 VA pipeline 배치를 빠르게 이해하기 위한 문서입니다.

관련 문서:

- 사용 명령: [development-guide.md](./development-guide.md)
- 검증 기준: [stream-verification.md](./stream-verification.md)
- VA 상세: [video-analysis.md](./video-analysis.md)
- YouTube 실험 기능: [youtube-import.md](./youtube-import.md)

## 1. 목표

- macOS/Linux에서 동작하는 C++17 기반 RTSP/WebRTC 미디어 중계 서버
- 동일 source에 여러 client가 붙어도 source pull은 1회만 유지하고 fan-out
- RTSP/WebRTC egress를 같은 stream/session 구조 위에서 제공
- VA 분석은 media relay를 막지 않는 선택 계층으로 배치
- 다채널 환경에서 session, stream, analysis state가 무한 증가하지 않도록 제한과 cleanup 적용

## 2. 전체 연결 모델

```text
Client <-> RTSP/WebRTC <-> MediaServer <-> Source
```

Source는 file, RTSP pull, WebRTC publish, HTTP/HLS URI가 될 수 있습니다. 앞단 protocol과 뒷단 source protocol은 독립입니다.

```text
RTSP Client
    |
    v
RTSP Adapter
    |
    v
SessionManager
    |
    v
StreamRegistry -- StreamKey dedup
    |
    v
SharedStream <---- SourceWorker <---- File / RTSP / WebRTC / HTTP-HLS
    |
    +----> RTSP Egress
    |
    +----> WebRTC Egress
    |
    +----> optional Analysis Tap
```

## 3. 주요 컴포넌트

| 컴포넌트 | 역할 |
| --- | --- |
| Ingress/Egress Adapter | RTSP 요청, WebRTC HTTP signaling/WHEP/WHIP 요청을 내부 request로 변환 |
| SessionManager | session 생성/종료, ResourceGuard 확인, SharedStream 구독 연결, analysis tap 생성 |
| StreamRegistry | StreamKey 기준 SharedStream dedup 저장소 |
| SharedStream | SourceWorker에서 받은 packet을 여러 client/analysis subscriber에 fan-out |
| SourceWorker | file, RTSP pull, WebRTC publish, HTTP/HLS URI source를 읽어 SharedStream에 공급 |
| RTSP Egress | SharedStream packet을 RTSP route별 output으로 변환 |
| WebRTC Egress | SharedStream packet을 WebRTC signaling/WHEP client로 전송 |
| Analysis Tap | SharedStream을 구독해 VA decode/inference/overlay/event 처리를 수행 |

### HTTP Auth / Principal MVP

운영 사이트와 클라이언트 사이트는 네트워크 위치가 아니라 HTTP principal의 role/scope로 구분합니다. 초기 구현은 token auth와 account login/session MVP를 함께 제공합니다.

요청 인증 흐름:

```text
HTTP request
  -> Authorization: Bearer <token> 또는 개발용 ?token=<token> 또는 session cookie
  -> Principal{username, role, scopes, displayName, authMode, isAuthenticated, passwordChangeRequired}
  -> route별 RequireRole / RequireScope guard
```

`MEDIA_SERVER_AUTH_MODE=off`에서는 기존 개발/검증 호환을 위해 dev admin principal을 반환합니다. `MEDIA_SERVER_AUTH_MODE=token`에서는 admin/operator/viewer/integrator env token이 `/auth/whoami`에서 principal로 확인됩니다. `MEDIA_SERVER_AUTH_MODE=session`에서는 users file의 `passwordHash`를 libsodium password hashing으로 검증한 뒤 HttpOnly/SameSite=Lax cookie session을 발급합니다. Password policy/lockout/session hardening은 HTTP auth/users file에만 적용되며, media pipeline, WebRTC DataChannel schema, SSE/WS metadata schema, Event POST payload는 변경하지 않습니다. 이번 MVP는 setup/login/logout/password change, whoami, 임시 `/ops`/`/client` landing, guard helper 중심이며, `/lab`, `/ops`, `/client`, metadata/event API의 세부 차단 정책은 SourceRegistry/PublishedView와 route 분리 단계에서 좁혀갑니다.

기본 역할:

- `admin`: 모든 기능
- `operator`: 운영 live monitor, rule/scenario 관리, runtime dashboard, event 조회
- `viewer`: 할당된 live view, 제한된 dashboard, 최근 event 요약
- `integrator`: 허용된 metadata/event API 접근

### SourceRegistry / PublishedView MVP

운영자가 등록하는 실제 source와 클라이언트가 접근하는 공개 view를 분리합니다. SourceRegistry는 source 원본 설정을 보관하고, PublishedView는 client scope에 노출할 live view 정책만 보관합니다.

```text
Operator
  -> /ops/api/sources
  -> SourceRegistry{sourceId, kind, canonicalSourceKey, file/rtspUrl/webrtcSourceId/httpUrl}
  -> /ops/api/views
  -> PublishedView{viewId, sourceId, defaultRuleId, allowedRuleIds, clientGroups}

Viewer
  -> Principal scope view:read:{viewId}
  -> /client/api/views
  -> PublishedView public fields only
```

SourceRegistry는 `.media_server.sources.json`, PublishedView는 `.media_server.views.json`을 기본 저장소로 사용합니다. `canonicalSourceKey`는 file token 또는 URL을 정규화해 중복 등록을 막는 내부 운영 키이며, RTSP/HTTP URL query 순서 차이는 같은 source로 취급합니다.

클라이언트 API는 `view:read:{viewId}` scope가 있는 view만 반환하고, `file`, `rtspUrl`, `httpUrl`, `webrtcSourceId`, `canonicalSourceKey` 같은 원본 locator는 반환하지 않습니다. PublishedView의 `defaultRuleId`와 `allowedRuleIds`는 기존 `vaRule` ID를 참조하지만, 기존 `vaRule` 저장 구조와 `vaRule=<id>` 호출 방식은 그대로 유지합니다.

### Source+Profile analysis reuse

분석 tap은 source identity와 analysis profile을 합친 reuse key로 공유합니다. 같은 source에서 detector model, label path, FPS, input size, sampling, YOLO preprocessing, detection/tracking 설정, tracker association config, debug-state 설정이 같으면 WebRTC overlay viewer, metadata viewer, SSE/WS side-channel, Runtime Dashboard가 같은 `analysis-tap-*`를 재사용합니다. Overlay 표시 옵션, route, client id, 단일 `vaRule` 선택은 reuse key에 넣지 않아 UI 표시 차이만으로 YOLO/ONNX inference를 중복 실행하지 않습니다.

각 attach는 logical refcount만 올리고, 마지막 detach에서만 SharedStream analysis subscriber와 detector worker를 해제합니다. Runtime status의 `analysisMatching.activeTaps[]`는 `reuseKey`, `refCount`, `reuseAttachCount`, `lastUsedAgeMs`를 노출하고, `reuseGroups[]`는 source/profile 기준 공유 상태를 요약합니다. Debug counter는 `analysisTapCreatedCount`, `analysisTapReusedCount`, `analysisTapRejectedCount`, `analysisTapRefCount`, `analysisTapReuseKey`를 추가로 제공합니다.

동일 source에서 동시에 만들 수 있는 서로 다른 profile/tap 수는 `MEDIA_SERVER_ANALYSIS_MAX_ACTIVE_PROFILES_PER_SOURCE`, `MEDIA_SERVER_ANALYSIS_MAX_ACTIVE_TAPS_PER_SOURCE`로 제한할 수 있습니다. 기본값은 각각 `8`이며 `0`은 제한 비활성입니다. 여러 `vaRule`이 같은 source/profile tap을 공유하면 tap context의 rule id 목록에 병합되어 저장된 rule/scenario evaluation은 같은 분석 결과 위에서 fanout됩니다.

## 4. Source 종류

| Source | 요청 예 | 상태 |
| --- | --- | --- |
| file | `?file=sample_h264.mp4` | 기본 경로 |
| RTSP pull | `?url=rtsp%3A%2F%2Fcamera%2Flive` | 기본 경로 |
| WebRTC publish | `?source=webrtc&url={sourceId}` | WHIP publish source 소비 |
| HTTP/HLS URI | `?source=http&url={encodedUrl}` | 로컬 HTTP MP4 기본 검증, HLS/외부 URI는 선택 검증 |
| YouTube experimental | `source=youtube` | 실험 기능. 상세는 [youtube-import.md](./youtube-import.md) |

`file` token은 기본적으로 `video` root 아래에서 해석합니다. 외부 URL과 시스템 경로 사용 정책은 [config-reference.md](./config-reference.md)를 봅니다.

## 5. StreamKey / SharedStream / Fan-Out

`StreamKey`는 동일 source 요청을 판별하는 정규화 key입니다.

예:

- 같은 file token은 같은 SharedStream을 재사용
- 같은 RTSP URL은 query 순서 차이가 있어도 canonical key로 묶음
- `vaRule=<id>`는 저장된 source mapping을 먼저 적용한 뒤 stream key를 만듦

`SharedStream`은 source worker와 subscriber 사이의 공통 packet hub입니다.

특징:

- source reader는 source별 1개
- client subscriber와 analysis subscriber를 분리
- 각 subscriber는 bounded queue와 worker를 가짐
- 느린 subscriber는 자신의 queue에서 drop-oldest 처리
- one client 장애가 source loop나 다른 client를 중단시키지 않음
- source 제거 판단은 relay client뿐 아니라 analysis tap까지 포함한 total subscriber count를 사용

## 6. 동시성 모델

```text
SourceWorker thread
    -> SharedStream::FanOut(packet)
       -> subscriber queue A -> RTSP writer
       -> subscriber queue B -> WebRTC writer
       -> subscriber queue C -> AnalysisManager
```

동시성 원칙:

- StreamRegistry acquire/release 임계구역은 짧게 유지
- SharedStream subscriber map 변경은 lock으로 보호
- packet payload는 immutable처럼 취급
- subscriber backpressure는 subscriber별 queue에서 격리
- VA queue overflow는 오래된 frame을 버려 media forwarding에 backpressure를 전파하지 않음
- event storage, event POST, appearance/Re-ID hook은 bounded queue 또는 opt-in worker로 분리

## 7. RTSP/WebRTC 요청 흐름

RTSP consume:

```text
RTSP DESCRIBE/SETUP/PLAY
  -> RTSP Adapter
  -> request parser
  -> SourceSpec + StreamKey
  -> SessionManager.CreateSession
  -> StreamRegistry.Acquire
  -> SharedStream subscriber 추가
  -> RTSP egress pipeline
```

WebRTC consume:

```text
POST /webrtc/session or /whep
  -> WebRTC HTTP Server
  -> request parser
  -> SourceSpec + StreamKey
  -> SessionManager.CreateSession
  -> StreamRegistry.Acquire
  -> SharedStream subscriber 추가
  -> WebRTC offer/answer + ICE
```

WebRTC publish:

```text
POST /whip/publish?sourceId=...
  -> WebRTC source session
  -> WebRTC source registry
  -> source=webrtc&url={sourceId}
  -> SharedStream consumer path
```

대표 endpoint와 실행 명령은 [development-guide.md](./development-guide.md)에 둡니다.

## 8. VA Pipeline 배치

VA는 SharedStream의 optional subscriber입니다. 분석이 켜져도 source 수집과 egress writer가 분석 worker에 직접 묶이지 않게 합니다.

```text
SharedStream packet
  -> Analysis Tap
  -> Raw Video Decoder
  -> frame sampling / bounded queue
  -> YOLO/ONNX Detection
  -> Direction-Based Tracker
  -> TrackedObjectMetadata adapter
  -> TrackStateManager
  -> SceneContextBuilder
  -> RuleEventEngine
  -> ScenarioEngine
  -> EventManager
  -> VaRuntimeMetadataBuilder
  -> Overlay / Runtime Metadata / Event POST / EventRecord / WebRTC DataChannel / SSE-WS Side-Channel
```

RTSP/WebRTC overlay는 egress raw video 구간에서 가까운 PTS의 analysis result를 합성합니다. PTS 매칭 실패 시 최신 result로 fallback합니다.

`VaRuntimeMetadataBuilder`는 viewer/dashboard/side-channel이 공유할 내부 runtime metadata frame을 만듭니다. WebRTC DataChannel은 이 frame을 기존 `media-server.webrtc.va-metadata.v1` schema로 투영해 외부 호환성을 유지하고, dashboard와 SSE/WS side-channel은 `media-server.va.runtime-metadata.v1` 내부 schema를 사용합니다.

Metadata 출력 정책:

- WebRTC browser viewer: video/audio stream과 별도로 `vaMetadata=1` DataChannel을 열고, Lab client-side canvas overlay가 metadata를 표시합니다.
- RTSP 일반 viewer: DataChannel이 없으므로 server-side overlay가 기본 표시 방식입니다.
- Custom RTSP client: RTSP raw stream과 SSE/WS metadata side-channel을 별도로 연결해 client-side overlay를 직접 구현할 수 있습니다.
- 런타임 대시보드: `/lab/runtime/status`, `/metrics`, `/state-dump`, event status endpoint를 polling하고 media pipeline을 직접 blocking하지 않습니다.

VA 상세 동작과 API는 [video-analysis.md](./video-analysis.md)에 둡니다.

## 9. State 관리

VA 상태는 streamId/channelId 기준으로 분리합니다. 서로 다른 channel의 track id가 섞이면 안 됩니다.

| State | Owner | 역할 |
| --- | --- | --- |
| TrackRuntimeState | TrackStateManager | track별 latest bbox/center/class/confidence, first/last seen, lifecycle, observation ring buffer, trajectory |
| ZoneState | SceneContextBuilder | track별 현재/이전 zone, entered/exited time, dwell time, restricted zone 여부 |
| LineCrossState | SceneContextBuilder | line별 signed side, crossing 여부, raw/allowed direction, lastCrossTime |
| ScenarioInstance | ScenarioEngine | stream/channel/track/scenario별 phase와 timestamp |
| EventState | EventManager | event lifecycle, cooldown, dedupe, cleanup 대상 state |
| EventRecord | EventStorage | event 조회/연결용 optional 저장 record |
| VaRuntimeMetadataFrame | VaRuntimeMetadataBuilder | stream/channel/frame 기준 tracks/events/scenarios/metrics를 묶는 dashboard/DataChannel/side-channel 공통 frame |

핵심 원칙:

- frame 원본 장기 저장 금지
- track별 metadata만 제한 보관
- trajectory는 downsample
- appearance/Re-ID profile은 optional
- state는 stream/channel scope로 분리

## 10. Cleanup 정책

Cleanup은 다채널 장기 실행에서 state가 무한 증가하지 않게 하는 보호 장치입니다.

대상:

- Lost/Terminated track
- 오래된 observation/trajectory
- stale SceneContext
- ended/cooldown ScenarioInstance
- stale EventManager lifecycle state
- EventStorage/Event POST/Appearance queue의 오래된 job

정책:

- active track은 cleanup으로 삭제하지 않음
- stream/channel별 active track 상한 유지
- recent observation/history 상한 유지
- trajectory point 상한 유지
- scenario instance 상한 유지
- cleanup interval은 config로 분리
- lock 범위는 state map 정리 시점으로 제한

상세 설정명은 [config-reference.md](./config-reference.md)를 봅니다.

## 11. Metrics / Runtime Status

런타임 확인 endpoint:

```text
GET /lab/runtime/status
GET /lab/analysis/taps/{tapId}
GET /lab/analysis/taps/{tapId}/metrics
GET /lab/analysis/event-post/status
GET /lab/analysis/event-storage/status
```

주요 지표:

- active sessions
- active streams
- active analysis taps
- profile/rule document count
- active/lost/reacquired/terminated track count
- observation/trajectory count
- scenario instance count
- event emitted/dedup/cleanup count
- queue pending/drop/stale drop
- inference latency
- TrackHealth unstable/overlap/missed/direction summary
- EventStorage/Event POST queue 상태
- metadata side-channel active client count
- WebRTC metadata sent/dropped/failure count는 trace log와 longrun summary에서 확인

검증 기준은 [stream-verification.md](./stream-verification.md)에 둡니다.

## 12. 확장 포인트

| 확장 포인트 | 현재 상태 | 목적 |
| --- | --- | --- |
| EventStorage | optional JSON Lines | EventRecord 저장과 후속 조회/API 연결 |
| WebRTC DataChannel | opt-in | runtime metadata frame을 기존 WebRTC schema로 직렬화해 video stream과 별도로 전달 |
| Runtime Metadata Side-Channel | SSE/WebSocket 최소 구현 | custom client가 RTSP video와 별도 metadata stream을 함께 소비 |
| 런타임 대시보드 | 구현 완료 | active session/stream/tap, VA metrics, state dump, tracking issue report를 Lab에서 확인 |
| Scenario UI | 일부 완료, 일부 다음 작업 | ReEntry/IntrusionAfterLineCrossing은 룰 편집 UI에서 선택 가능. Loitering UI와 ZoneOccupancyScenario는 다음 작업 |
| Re-ID hook | 기본 NoOp, 실험용 extractor hook | appearance profile과 reacquire/low confidence association 보조 |
| Homography | optional config | image point를 ground-plane point로 변환해 distance/speed/radius 계산 보조 |
| Snapshot/Clip hook | marker hook 중심 | EventRecord와 snapshot/clip path 연결. 실제 recorder는 후속 |

확장 원칙:

- media forwarding이 최우선
- queue는 bounded
- 실패는 log/metric으로 남기고 streaming은 계속 진행
- 외부 event JSON/API/POST 형식은 별도 승인 없이 변경하지 않음
- 구현 완료/실험/예정 상태는 [video-analysis.md](./video-analysis.md)와 [development-backlog.md](./development-backlog.md)에 구분해서 기록
