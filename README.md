# Media Server

RTSP/WebRTC 스트림을 중계하고, 선택적으로 YOLO/ONNX 기반 영상 분석 overlay와 Rule/Scenario 이벤트를 붙이는 C++17 미디어 서버입니다.

## 한눈에 보기

- **스트리밍**:
  RTSP output, WebRTC signaling/WHEP output, 외부 WHEP pull, 내부 WHIP publish sourceId 소비 경로를 같은 서버에서 다룹니다.
- **영상 분석**:
  `va=1` overlay, `vaRule=<id>` 호출, Rule/Profile/Scenario, 객체/영역/라인 설정, Event POST와 EventRecord 저장을 제공합니다.
- **제품 화면**:
  `/ops`는 운영 콘솔, `/client`는 viewer 포털, `/lab`은 개발/검증 화면으로 분리합니다.
- **권한과 계정**:
  `/setup`, `/login`, role/scope principal, admin 계정 관리, viewer invite/request 승인 흐름을 포함합니다.
- **검증 구조**:
  UI/Auth smoke, VA metadata replay, baseline fixture, runtime state 검증 명령을 함께 제공합니다.

## 대표 UI 미리보기

README에는 전체 흐름이 바로 읽히는 대표 제품 화면만 배치합니다.
운영자 라이브 모니터, 개발 진단, 분석 편집 상세는 [docs/ui-guide.md](docs/ui-guide.md)에서 따로 다룹니다.

**Ops Home**

![운영 홈](docs/assets/ui/ops-home.png)

**운영 채널 관리**

![운영 채널 관리](docs/assets/ui/ops-channels.png)

**운영 룰 관리**

![운영 룰 관리](docs/assets/ui/ops-rules.png)

**운영 사용자 관리**

![운영 사용자 관리](docs/assets/ui/ops-users.png)

**클라이언트 라이브**

![클라이언트 라이브](docs/assets/ui/client-live.png)

채널 화면에서는 아래 두 입력을 분리해 설명합니다.

- `외부 WHEP pull`: 외부 playback endpoint를 서버 pull source로 등록
- `Published WebRTC source`: 외부 URL이 아니라 내부 `/whip/publish`로 먼저 등록된 `sourceId` 연결

문서 길잡이:

- 제품 화면과 동작 설명: [docs/ui-guide.md](docs/ui-guide.md)
- 영상 분석 구조와 런타임: [docs/video-analysis.md](docs/video-analysis.md)
- 개발/빌드/검증 명령: [docs/development-guide.md](docs/development-guide.md)
- 스트림 검증 명령 모음: [docs/stream-verification.md](docs/stream-verification.md)

## 전체 Pipeline

```text
File / RTSP Pull / WHEP Pull / WHIP Publish / HTTP-HLS URI
        -> Media Server
        -> RTSP Output / WebRTC Output
        -> optional VA 오버레이 / 룰 이벤트 / 시나리오 이벤트 / 런타임 메타데이터
```

VA 내부 흐름:

```text
YOLO Detection
  -> Direction-Based Tracker
  -> TrackStateManager
  -> SceneContextBuilder
  -> RuleEventEngine / ScenarioEngine
  -> EventManager
  -> Overlay / Runtime Metadata / Event POST / EventRecord
```

## 빠른 시작

```bash
./server.sh install
./server.sh build
./server.sh start
./server.sh status
./server.sh urls
```

종료:

```bash
./server.sh stop
```

개발 중 로그를 바로 보려면:

```bash
./server.sh foreground
```

설치/빌드/디버깅 상세는 [docs/development-guide.md](docs/development-guide.md)를 봅니다.

## 대표 접속 URL

실제 host/port는 `./server.sh status`와 `./server.sh urls` 출력값을 우선합니다.

| 용도 | 예시 |
| --- | --- |
| Root entry | `http://127.0.0.1:8080/` |
| 최초 관리자 설정 | `http://127.0.0.1:8080/setup` |
| 로그인 | `http://127.0.0.1:8080/login` |
| 운영 콘솔 shell MVP | `http://127.0.0.1:8080/ops` 또는 `/ops/home` |
| 운영 Dashboard UI MVP | `http://127.0.0.1:8080/ops/dashboard` |
| 운영 채널/룰/사용자 관리 | `http://127.0.0.1:8080/ops/sources`, `/ops/rules`, `/ops/users` |
| 클라이언트 포털 shell MVP | `http://127.0.0.1:8080/client` 또는 `/client/live` |
| 클라이언트 Dashboard UI MVP | `http://127.0.0.1:8080/client/dashboard` |
| Lab, 개발/검증용 | `http://127.0.0.1:8080/lab` |
| Lab Rule Editor | `http://127.0.0.1:8080/lab/rules` |
| RTSP | `rtsp://127.0.0.1:8554/dhseo?file=sample_h264.mp4` |
| WebRTC signaling | `POST http://127.0.0.1:8080/webrtc/session?file=sample_h264.mp4` |
| WHEP | `POST http://127.0.0.1:8080/whep?file=sample_h264.mp4` |
| VA overlay | `rtsp://127.0.0.1:8554/dhseo?file=va_four_scene_sample.mp4&va=1` |
| 저장 VA 룰 | `rtsp://127.0.0.1:8554/dhseo?vaRule=1` |

기본 `MEDIA_SERVER_AUTH_MODE=auto`에서는 users file 또는
`admin.passwordHash`가 없으면 `/`가 `/setup`으로 이동합니다.

접근 흐름:

- setup 완료 전: `/ -> /setup`
- setup 완료 후 기본 진입점: `/login`
- admin/operator landing: `/ops/home`
- viewer landing: `/client/live`

권한 기준:

- `/ops`는 운영 콘솔입니다.
- `/client`는 클라이언트 포털입니다.
- `/lab`, `/lab/rules`는 개발/검증용 화면입니다.
- `/ops` 변경 API는 `source:write`가 필요합니다.
- `/lab` rule/profile 변경 API는 `rule:write`가 필요합니다.
- integrator는 UI shell 대신
  `/client/api/views/{viewId}/events`,
  `/client/api/views/{viewId}/metadata` 같은 scoped API를 사용합니다.

직접 media 생성 route:

- `/webrtc/session`, `/whep`, `/whip/publish`는 auth off 개발 모드 또는
  admin/operator `ops:read`, `lab:read` 권한이 있는 요청에서만 사용합니다.
- Auth on의 WebRTC/WHEP/WHIP 후속 answer/ICE/delete route는
  난수 session id와 생성 principal 또는 `X-Session-Capability`로 보호합니다.
- viewer 제품 흐름은
  `/client/api/views/{viewId}/webrtc/session` wrapper와 같은 prefix의
  answer/ICE/delete wrapper만 사용합니다.

추가 제약:

- Client Live의 `va-rule` mode는 rule source와 PublishedView source가 같을 때만 허용합니다.
- `/ws/va-metadata`는 Lab/custom-client 경로로 분류합니다.
- 내장 HTTP parser는 header/body 크기, `Content-Length` 형식,
  socket read timeout, 동시 연결 상한을 적용합니다.

## 영상 분석 사용 흐름

1. `/lab/rules`에서 영상 분석 설정 탭을 엽니다.
2. 룰을 추가하고 source, profile, 기본 event 또는 scenario를 선택합니다.
3. polygon 제한구역 또는 line crossing 선을 지정합니다.
4. 저장하면 숫자 기반 `vaRule` ID가 배정됩니다.
5. 영상 분석 보기 탭에서 실시간 스트리밍, `va=1`, `vaRule=<id>` 모드로 확인합니다.
6. Runtime Dashboard 탭에서 active analysis tap, metadata/backpressure, scenario/event/debug 상태를 확인합니다.
7. WebRTC 메타데이터 뷰어에서는 `vaMetadata=1` DataChannel과 browser client-side overlay를 확인합니다.
8. 외부 RTSP 클라이언트에서는 `?va=1` 또는 `?vaRule=<id>` server-side overlay URL을 사용합니다.

RTSP 일반 viewer는 WebRTC DataChannel metadata를 표시하지 않습니다.
custom client가 metadata를 따로 소비해야 할 때는
RTSP raw stream과 SSE/WS metadata side-channel을 별도로 조합합니다.
자세한 정책은 [docs/ui-guide.md](docs/ui-guide.md)와
[docs/video-analysis.md](docs/video-analysis.md)를 봅니다.

## 시나리오 로드맵 상태

- 1차 완료: Runtime Dashboard trend/stale/cleanup warning,
  scenario rule payload의 runtime per-rule 설정 연결,
  ReEntry, IntrusionAfterLineCrossing, Loitering, ZoneOccupancy의
  룰 편집 UI 선택/저장 템플릿과 현장형 tuning preset.
- 1차 완료: Auth/account API와 route MVP, SourceRegistry / PublishedView API와 route MVP, Client scoped dashboard API MVP, Client Live Monitor 2x2 MVP.
- 1차 완료: `/setup`, `/login`, `/ops`, `/client` 제품 UI shell 통합. Ops 주 메뉴는 홈, 대시보드, 채널, 룰, 사용자, 클라이언트 미리보기 순서이며, client 주 메뉴는 라이브와 대시보드만 노출합니다.
- 1차 완료: `/ops/dashboard`와 `/ops/rules`는 Lab iframe 없이
  `/ops/api/runtime/status`, `/ops/api/rules/catalog`,
  `/ops/api/events/status` 제품 API로 운영 카드와 룰 화면을 표시합니다.
  `/ops/events`, `/client/events`는 제품 primary tab에서 숨기고,
  이벤트 요약은 룰/대시보드 맥락에서 확인합니다.
- 1차 완료: `/ops/live`는 자동 media session을 열지 않는 고밀도 운영 상태 타일로 source/runtime/event를 표시합니다.
- 1차 완료: EventRecord archive 포함 조회와 비파괴 compaction snapshot 생성/목록/다운로드/삭제 API/UI, snapshot frame 저장과 pre/post frame bundle recorder manifest를 제공합니다.
- 남은 후속 작업: PublishedView 기반 scope picker,
  archive cleanup policy 고도화를 별도 묶음으로 관리합니다.
- 제한/미구현: MP4/VMS/NVR형 장기 녹화, Re-ID 기본 기능화,
  운영 TURN relay/auth, 외부 WHEP credential 정책은 별도 운영 범위입니다.

이 로드맵 정리는 기존 Event POST payload, WebRTC DataChannel schema, SSE/WS metadata schema 변경을 의미하지 않습니다. snapshot/clip hook은 EventRecord용 짧은 frame evidence recorder이며 VMS/NVR 녹화 기능이 아닙니다.

## 테스트 요약

기본 회귀:

```bash
./server.sh test
```

`./server.sh test`, `./server.sh test --basic`,
`./server.sh test --full`, `./server.sh verify-predev --quick`는
기본 추가 RTSP/WebRTC source 영상과 codec matrix를 사용하므로 느립니다.

문서/UI/Auth/권한처럼 media pipeline 자체를 바꾸지 않은 변경에서는
위 명령을 기본으로 돌리지 않고, 아래 전용 smoke를 사용합니다.

문서/UI/Auth/권한 전용 빠른 검증:

```bash
./server.sh build
git diff --check -- README.md docs scripts src include
./server.sh verify-auth-routes
./server.sh verify-ops-client-ui
./server.sh verify-rule-ui
./server.sh verify-lab-layout --no-screenshots
./server.sh verify-analysis-state
```

`verify-auth-routes`는 격리 서버를 직접 띄웁니다.
`verify-ops-client-ui`, `verify-rule-ui`, `verify-lab-layout`는
실행 중인 HTTP 서버에 붙는 UI smoke입니다.

UI만 확인할 때는 별도 터미널에서
`MEDIA_SERVER_AUTH_MODE=off ./server.sh foreground`로 서버를 띄운 뒤
필요하면 `--http-base`를 지정합니다.

로컬 풀 검증:

```bash
./server.sh test --full
```

기능 개발 전후 안정화 묶음:

```bash
./server.sh verify-predev --quick
```

VA replay/상태 검증:

```bash
./server.sh verify-analysis-state
./server.sh verify-va-replay
```

VA/Auth 주요 검증:

```bash
./server.sh verify-webrtc-va-metadata
./server.sh verify-va-runtime-console
./server.sh verify-auth-bootstrap
./server.sh verify-auth-users
./server.sh verify-auth-routes
```

로컬 QA나 수동 smoke에서 테스트 계정을 만들거나 초기화할 때는 계정 비밀번호를 `qweasd0-`로 통일합니다. 이 값은 테스트 재현성을 위한 규칙이며, 제품 기본 admin 비밀번호를 의미하지 않습니다.

현재 검증 기준은 [docs/stream-verification.md](docs/stream-verification.md)에 정리되어 있습니다.

## 문서 지도

| 문서 | 역할 |
| --- | --- |
| [docs/development-guide.md](docs/development-guide.md) | 빌드, 실행, 디버깅, 테스트 명령 |
| [docs/ui-guide.md](docs/ui-guide.md) | Auth/Ops/Client/Lab UI 사용법과 현재 MVP 범위 |
| [docs/config-reference.md](docs/config-reference.md) | 환경변수와 주요 설정 reference |
| [docs/media-server-architecture.md](docs/media-server-architecture.md) | RTSP/WebRTC pipeline, stream/session, VA layer 배치 |
| [docs/video-analysis.md](docs/video-analysis.md) | YOLO, tracking, TrackState, scenario, replay, EventRecord |
| [docs/analysis-threshold-baselines.md](docs/analysis-threshold-baselines.md) | Loitering/ZoneOccupancy 현장 시작 threshold |
| [docs/stream-verification.md](docs/stream-verification.md) | 현재 검증 기준과 실행 명령 |
| [docs/development-backlog.md](docs/development-backlog.md) | 현재 남은 작업과 후속 로드맵 |
| [docs/history/development-history.md](docs/history/development-history.md) | 완료된 개발 이력 |
| [docs/history/verification-history.md](docs/history/verification-history.md) | 과거 상세 검증 이력 |
| [docs/youtube-import.md](docs/youtube-import.md) | YouTube import/source 실험 기능 |

## 라이선스/배포 주의

- YOLO model, label, 외부 영상 source는 각 라이선스와 사용 권한을 별도로 확인해야 합니다.
- YouTube source/import는 개발/검증용 기능이며 운영 기본 기능이 아닙니다.
- EventRecord는 active/archive 조회, compaction snapshot 관리, 짧은 snapshot/clip frame evidence recorder 중심입니다. MP4/VMS/NVR형 장기 녹화, Re-ID/appearance 기본 기능화는 개인정보와 보관 정책 검토가 필요합니다.
- 외부 HTTP/HLS URI, 외부 WHEP URL pull source, 운영 TURN relay/auth는 네트워크와 credential 상태에 따라 별도 검증이 필요합니다. 인증 토큰이 필요한 WHEP endpoint credential 보관/주입은 아직 별도 운영 정책 대상입니다.
