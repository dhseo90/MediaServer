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

Source는 file, RTSP pull, HTTP/HLS URI, 외부 WHEP playback URL pull, 내부 `/whip/publish` sourceId 소비 경로가 될 수 있습니다. 앞단 protocol과 뒷단 source protocol은 독립입니다. `kind=webrtc`는 내부 WHIP publish sourceId, `kind=whep`은 외부 WHEP endpoint URL입니다.

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
SharedStream <---- SourceWorker <---- File / RTSP / HTTP-HLS / WHEP / WHIP-published sourceId
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
| SourceWorker | file, RTSP pull, HTTP/HLS URI, 외부 WHEP playback URL, 내부 WHIP-published sourceId를 읽어 SharedStream에 공급 |
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

`MEDIA_SERVER_AUTH_MODE=auto`가 제품 기본 모드입니다. Users file이 없거나 admin passwordHash가 없으면 setup required 상태로 보고 `/setup`에서 최초 admin 비밀번호를 설정하게 하며, setup 완료 후에는 session login을 요구합니다. `MEDIA_SERVER_AUTH_MODE=off`에서는 기존 개발/검증 호환을 위해 dev admin principal을 반환합니다. `MEDIA_SERVER_AUTH_MODE=token`에서는 admin/operator/viewer/integrator env token이 `/auth/whoami`에서 principal로 확인됩니다. `MEDIA_SERVER_AUTH_MODE=session`에서는 users file의 `passwordHash`를 libsodium password hashing으로 검증한 뒤 HttpOnly/SameSite=Lax cookie session을 발급합니다. Password policy/lockout/session hardening은 HTTP auth/users file에만 적용되며, media pipeline, WebRTC DataChannel schema, SSE/WS metadata schema, Event POST payload는 변경하지 않습니다.

Auth on 상태에서 직접 media 생성 endpoint인 `POST /webrtc/session`, `POST /whep`, `POST /whip/publish`는 generic source locator를 받는 개발/Lab/운영자 표면으로 취급합니다. 따라서 admin/operator `ops:read` 또는 `lab:read` scope가 필요합니다. Viewer/client 제품 흐름은 source locator를 받지 않는 `/client/api/views/{viewId}/webrtc/session` wrapper와 같은 prefix의 answer/ICE/delete wrapper만 사용하며, 이 wrapper가 PublishedView scope, source override 금지, `va-rule` source 일치 검증을 적용하고 내부 generic session id/session token을 숨깁니다.

내장 HTTP server는 전역 `Access-Control-Allow-Origin: *`를 사용하지 않습니다. `Origin`이 없는 일반 curl/server-to-server 요청에는 CORS 헤더를 붙이지 않고, `Origin`이 있으면 `Host`와 같은 origin인 경우에만 해당 origin을 반사합니다. 다른 origin의 실제 요청과 preflight는 route handler에 들어가기 전에 `403`으로 닫으며, SSE/WS metadata stream handshake도 같은 origin 정책을 따릅니다.

Auth 구성요소:

- `UserRegistry`: `.media_server.users.json`에 user, invite, access request를 저장하고 password hash/history, lockout, audit field를 관리합니다.
- `SessionStore`: random session id, expiry, idle timeout, role/scope snapshot을 메모리에 보관하고 login/password change/logout/disable/reset에서 session을 회전 또는 폐기합니다.
- `Principal`: request마다 Bearer/query token 또는 session cookie에서 생성되며 role, scope, displayName, authMode, authentication 상태를 포함합니다.
- `AuthGuard`: `RequireRole`, `RequireScope`, `IsAdmin`, `IsOperator`, `IsViewer`, `IsIntegrator` helper로 browser route는 login/forbidden page, API route는 JSON `401`/`403`을 반환합니다.

클라이언트 계정의 1차 정책은 admin 수동 생성/승인입니다. 자가 가입은 자동 승인하지 않고, `/client/request-access`와 `POST /client/api/access-requests`는 `pending` request만 users file에 저장합니다. `/ops/users`는 사용자 목록과 별도로 접근 요청 table을 표시해 admin이 pending request를 승인/거절하게 합니다. Public access request API는 4KiB body 상한, 5회/5분 peer rate limit, field 길이/제어문자/viewId 형식 검증, 기존 user와 pending username/contact 중복 차단, pending 100건 상한을 적용합니다. Admin approve는 password setup invite만 발급하며, invite가 수락되기 전까지 request는 user/password/session/view scope를 만들지 않습니다.

Users file은 `users`, `invites`, `accessRequests` top-level 배열을 보관합니다. `users[].passwordHash`, `passwordHistory`, `tokenHash`, `invites[].tokenHash`는 safe hash만 저장하며 API/UI 응답에는 노출하지 않습니다. Invite token은 password setup 전용이며 원문은 발급 응답에서 한 번만 표시됩니다. `/ops/api/invites`와 access-request approve는 invite의 role/scope snapshot만 저장하고 기존 enabled user를 즉시 변경하지 않습니다. `/invite/setup`에서 비밀번호를 설정하면 그 시점에 user role/scope/password를 갱신하고 invite token hash를 폐기하며 기존 session은 폐기됩니다. User-only mutation도 전체 auth store를 다시 읽어 `invites`와 `accessRequests`를 보존한 뒤 저장하며, 기존 store를 읽을 수 없거나 record가 유효하지 않으면 저장을 중단합니다. 저장 시에는 임시 파일을 owner-only mode `0600`으로 만들고 write/fsync/rename 후 parent directory를 fsync합니다. 기존 auth store를 읽을 때도 owner-only mode로 보정합니다.

기본 역할:

- `admin`: 모든 기능
- `operator`: 운영 콘솔, `source:write` 기반 채널/PublishedView 관리, `rule:write` 기반 rule/scenario 관리, runtime dashboard, event 조회
- `viewer`: 할당된 live view, 제한된 dashboard, 최근 event 요약
- `integrator`: UI shell 없이 허용된 client metadata/event API 접근

Viewer 계정은 `view:read:{viewId}`, `dashboard:read:{viewId}`, `event:read:{viewId}`, `metadata:read:{viewId}` 같은 view scope만 갖습니다. Integrator 계정은 `event:read:{viewId}`와 `metadata:read:{viewId}`만 갖고 `/client/api/views/{viewId}/events`와 `/client/api/views/{viewId}/metadata`에 접근합니다. PublishedView가 비어 있거나 아직 계정 UI와 직접 연결되지 않은 환경에서는 문자열 기반 view scope assignment를 사용할 수 있으며, viewer/integrator에는 debug/lab/ops/source/rule 관리 scope를 부여하지 않습니다.

### SourceRegistry / PublishedView MVP

운영자가 등록하는 실제 source와 클라이언트가 접근하는 공개 view를 분리합니다. SourceRegistry는 source 원본 설정을 보관하고, PublishedView는 client scope에 노출할 live view 정책만 보관합니다.

```text
Operator
  -> /ops/api/sources
  -> SourceRegistry{sourceId, kind, canonicalSourceKey, file/rtspUrl/webrtcSourceId/whepUrl/httpUrl}
  -> /ops/api/views
  -> PublishedView{viewId, sourceId, defaultRuleId, allowedRuleIds, clientGroups}

Viewer
  -> Principal scope view:read:{viewId}
  -> /client/api/views
  -> PublishedView public fields only
```

SourceRegistry는 `.media_server.sources.json`, PublishedView는 `.media_server.views.json`을 기본 저장소로 사용합니다. `canonicalSourceKey`는 file token, RTSP/HTTP/WHEP URL, 또는 WHIP publish sourceId를 정규화해 중복 등록을 막는 내부 운영 키이며, RTSP/HTTP/WHEP URL query 순서 차이는 같은 source로 취급합니다. Registry 저장은 임시 파일 write/fsync/rename 후 parent directory fsync로 반영합니다. 기존 registry file에 invalid source/view record, 중복 id/canonical key, 존재하지 않는 `sourceId` 참조가 있으면 기본 seed나 mutation으로 덮어쓰지 않고 load/write API가 실패합니다. 현재 `kind=webrtc`는 `/whip/publish`로 등록된 내부 sourceId 소비 경로이고, 외부 WebRTC/WHEP playback URL은 `kind=whep`과 `whepUrl`로 분리합니다.

클라이언트 API는 `view:read:{viewId}` scope가 있는 view만 목록에 반환하고, view별 dashboard/events/metadata API는 각각 `dashboard:read:{viewId}`, `event:read:{viewId}`, `metadata:read:{viewId}`를 요구합니다. `file`, `rtspUrl`, `httpUrl`, `webrtcSourceId`, `whepUrl`, `canonicalSourceKey` 같은 원본 locator는 반환하지 않습니다. PublishedView의 `maxTiles`는 Client Live UI 배정과 `/client/api/views/{viewId}/webrtc/session` wrapper에서 같은 principal+view 동시 session 상한으로 적용합니다. PublishedView의 `defaultRuleId`와 `allowedRuleIds`는 기존 `vaRule` ID를 참조하지만, Client Live에서 `va-rule` mode를 실행할 때는 해당 rule의 저장 source가 PublishedView source와 일치해야 합니다. 기존 `vaRule` 저장 구조와 `vaRule=<id>` 호출 방식은 그대로 유지합니다.

### Ops / Client UI shell and Lab APIs

HTTP UI는 같은 미디어/API 기능 위에 role별 shell을 얹는 구조입니다. Shell 통합은 browser route와 화면 구성만 다루며 media pipeline, Event POST payload, WebRTC DataChannel schema, SSE/WS metadata schema, scenario 판단 로직은 변경하지 않습니다. `webrtc_http_server.cpp`는 여전히 HTTP route dispatch와 media/auth glue를 많이 보유하지만, 제품 shell의 route별 브라우저 스크립트는 `product_ui_page_scripts.*`로 분리해 Ops/Client 화면 동작을 media signaling 구현과 물리적으로 섞지 않습니다.

- `/ops`: admin/operator용 운영 콘솔입니다. 공통 header/nav 아래에서 홈, 라이브, 대시보드, 채널, 룰, 사용자(admin), 클라이언트를 렌더링합니다. `/ops/home`은 운영 홈 summary MVP이고, `/ops/live`는 자동 media session을 열지 않는 고밀도 source/runtime/event 상태 타일입니다. `/ops/dashboard`는 `/ops/api/runtime/status` 기반 운영 카드, `/ops/rules`는 채널 분석 설정, 이벤트 템플릿, 분석 프로파일을 Lab iframe 없이 제품 컴포넌트로 표시합니다. `/ops/events`는 primary nav에서 숨긴 직접/진단 route로 보존하며 독립 제품 탭으로 취급하지 않습니다. raw JSON은 운영자 debug 접힘 영역에만 둡니다.
- `/client`: viewer/client 포털입니다. `/client/live`는 PublishedView 기반 2x2 live monitor MVP이고, `/client/dashboard`는 scoped summary와 sanitized event summary를 표시합니다. Client Events tab은 primary nav에서 제거했습니다. client shell과 client API는 source 원본 locator, Developer URL, raw JSON, `debugCounters`, internal session/tap id, rule/profile editor를 노출하지 않습니다. Integrator는 이 shell에 진입하지 않고 scoped client API만 사용합니다.
- `/lab/analysis/*`: 개발/검증 API입니다. `/lab`, `/lab/rules`, `/lab/import` 화면 route는 제품 화면으로 redirect하고, Runtime/metadata/event storage API만 권한 gate 뒤에 유지합니다. 운영 화면은 Lab editor를 embed하지 않고, 채널/룰 상태를 Ops 전용 API와 제품 컴포넌트로 표시합니다.

### Source+Profile analysis reuse

분석 tap은 source identity와 analysis profile을 합친 reuse key로 공유합니다. 같은 source에서 detector model, label path, FPS, input size, sampling, YOLO preprocessing, detection/tracking 설정, tracker association config, debug-state 설정이 같으면 WebRTC overlay viewer, metadata viewer, SSE/WS side-channel, Runtime Dashboard가 같은 `analysis-tap-*`를 재사용합니다. Overlay 표시 옵션, route, client id, 단일 `vaRule` 선택은 reuse key에 넣지 않아 UI 표시 차이만으로 YOLO/ONNX inference를 중복 실행하지 않습니다.

각 attach는 logical refcount만 올리고, 마지막 detach에서만 SharedStream analysis subscriber와 detector worker를 해제합니다. Runtime status의 `analysisMatching.activeTaps[]`는 `reuseKey`, `refCount`, `reuseAttachCount`, `lastUsedAgeMs`를 노출하고, `reuseGroups[]`는 source/profile 기준 공유 상태를 요약합니다. Debug counter는 `analysisTapCreatedCount`, `analysisTapReusedCount`, `analysisTapRejectedCount`, `analysisTapRefCount`, `analysisTapReuseKey`를 추가로 제공합니다.

동일 source에서 동시에 만들 수 있는 서로 다른 profile/tap 수는 `MEDIA_SERVER_ANALYSIS_MAX_ACTIVE_PROFILES_PER_SOURCE`, `MEDIA_SERVER_ANALYSIS_MAX_ACTIVE_TAPS_PER_SOURCE`로 제한할 수 있습니다. 기본값은 각각 `8`이며 `0`은 제한 비활성입니다. 여러 `vaRule`이 같은 source/profile tap을 공유하면 tap context의 rule id 목록에 병합되어 저장된 rule/scenario evaluation은 같은 분석 결과 위에서 fanout됩니다.

## 4. Source 종류

| Source | 요청 예 | 상태 |
| --- | --- | --- |
| file | `?file=sample_h264.mp4` | 기본 경로 |
| RTSP pull | `?url=rtsp%3A%2F%2Fcamera%2Flive` | 기본 경로 |
| WHEP pull | `?source=whep&url={encodedWhepEndpoint}` | 외부 WHEP playback endpoint를 서버가 pull해 SharedStream으로 fan-out |
| WebRTC publish source | `?source=webrtc&url={sourceId}` | `/whip/publish`로 등록된 내부 sourceId 소비 |
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

위 직접 consume endpoint는 auth on에서 admin/operator `ops:read` 또는 `lab:read`가 필요합니다. 생성된 HTTP signaling session id는 난수 token을 포함하며, answer/ICE/delete 후속 route는 생성 principal 또는 session별 `X-Session-Capability`와 일치해야 합니다. Client viewer는 PublishedView wrapper를 통해서만 WebRTC session을 생성하고 후속 signaling도 `/client/api/views/{viewId}/webrtc/session/{clientSessionId}` 아래에서 처리합니다. Client wrapper는 같은 principal+view의 활성 client session이 PublishedView `maxTiles`에 도달하면 추가 생성을 `409`로 거부합니다. Client Live의 browser `RTCPeerConnection`은 `/webrtc/config`의 `peerConnectionConfig`를 사용하므로 STUN/TURN과 `iceTransportPolicy=relay` 설정이 제품 client에도 적용됩니다. 내장 HTTP server는 parser 단계에서 header 64KiB, body 2MiB, `Content-Length` 숫자 형식, unsupported transfer encoding, read/write timeout, 동시 active connection 상한을 적용하고 초과 요청은 `400`/`408`/`413`/`431`/`503`으로 연결을 닫습니다.

WebRTC publish:

```text
POST /whip/publish?sourceId=...
  -> WebRTC source session
  -> WebRTC source registry
  -> source=webrtc&url={sourceId}
  -> SharedStream consumer path
```

WHIP publish도 sourceId를 등록하는 generic media endpoint이므로 auth on에서 같은 privileged media guard를 통과해야 합니다.

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
- Custom RTSP client: RTSP raw stream과 SSE/WS metadata side-channel을 별도로 연결해 client-side overlay를 직접 구현할 수 있습니다. Auth on에서는 SSE Lab endpoint와 `/ws/va-metadata`가 admin/operator 또는 `lab:read` 권한을 요구합니다.
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
| EventStorage | optional JSON Lines | EventRecord 저장, active/archive 조회/API, 비파괴 compaction snapshot 생성/목록/다운로드/삭제 |
| WebRTC DataChannel | opt-in | runtime metadata frame을 기존 WebRTC schema로 직렬화해 video stream과 별도로 전달 |
| Runtime Metadata Side-Channel | SSE/WebSocket + subscription filter/control | custom client가 RTSP video와 별도 metadata stream을 함께 소비. `eventType`, `scenarioName`, `trackId`, `zoneId` 등으로 payload 범위를 줄이고 `includeMetrics=0` 같은 include flag로 source/scenario/metrics/trackingIssueReport 필드를 제어 |
| Ops/Client UI shell | 1차 통합 완료 | `/ops` 운영 콘솔, `/client` 클라이언트 포털, `/lab/analysis/*` 개발/검증 API 역할 분리 |
| 런타임 대시보드 | 1차 구현 완료 | active session/stream/tap, VA metrics, state dump, tracking issue report를 Lab에서 확인. Ops dashboard는 runtime status를 운영 card UI로 요약. 장기 baseline/sparkline 고도화는 후속 |
| Scenario UI | 1차 구현 완료 | ReEntry/IntrusionAfterLineCrossing/Loitering/ZoneOccupancy는 룰 편집 UI에서 선택 가능 |
| Re-ID hook | 기본 NoOp, 실험용 extractor hook | appearance profile과 reacquire/low confidence association 보조 |
| Homography | optional config | image point를 ground-plane point로 변환해 distance/speed/radius 계산 보조 |
| Snapshot/Clip hook | 짧은 frame evidence recorder | EventRecord와 snapshot media/pre-post frame bundle manifest path 연결. 장기 녹화/MP4 recorder는 후속 |

확장 원칙:

- media forwarding이 최우선
- queue는 bounded
- 실패는 log/metric으로 남기고 streaming은 계속 진행
- 외부 event JSON/API/POST 형식은 별도 승인 없이 변경하지 않음
- 구현 완료/실험/예정 상태는 [video-analysis.md](./video-analysis.md)와 [development-backlog.md](./development-backlog.md)에 구분해서 기록
