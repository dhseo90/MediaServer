# Media Server

RTSP/WebRTC 스트림을 중계하고, 선택적으로 YOLO/ONNX 기반 영상 분석 overlay와 Rule/Scenario 이벤트를 붙이는 C++17 미디어 서버입니다.

## 한눈에 보기

| 주제 | 요약 |
| --- | --- |
| 스트리밍 | file, RTSP pull, WHEP pull, WHIP publish, HTTP/HLS source를 RTSP와 WebRTC/WHEP로 내보냅니다. |
| 영상 분석 | `va=1` overlay, 저장 룰 `vaRule=<id>`, Rule/Profile/Scenario, Event POST, EventRecord와 짧은 snapshot/clip evidence를 제공합니다. |
| 제품 화면 | `/ops`는 운영 콘솔, `/client`는 viewer 포털입니다. `/lab` 화면 route는 닫고 `/lab/analysis/*` API만 검증/연동용으로 유지합니다. |
| 계정/권한 | `/setup` 최초 관리자 설정, `/login` session 로그인, role/scope, admin 사용자 관리, viewer invite/request 승인 흐름을 사용합니다. |
| 검증 | UI/Auth smoke, VA replay, runtime state, 백업/복구 리허설, RC gate artifact 검증 명령을 `./server.sh`에서 제공합니다. |

| 영역 | 주요 진입점 |
| --- | --- |
| 운영 설정 | `/ops/home`, `/ops/sources`, `/ops/rules`, `/ops/users` |
| 운영 진단 | `/ops/dashboard`, `/ops/events` 직접 route |
| Viewer 화면 | `/client/live`, `/client/dashboard` |
| 개발/검증 API | `/lab/analysis/*`, `/lab/files`, `/lab/reports` |
| 스트리밍 출력 | `rtsp://.../dhseo?...`, `POST /webrtc/session`, `POST /whep` |

## 실행 환경

| 구분 | 기준 |
| --- | --- |
| OS | macOS 또는 Linux |
| 언어/빌드 | C++17, CMake 3.16+ |
| 미디어 런타임 | GStreamer 1.0, gst-rtsp-server, WebRTC 관련 GStreamer plugin |
| 선택 AI | ONNX Runtime, YOLO ONNX model, label file |
| 보조 도구 | Node.js, Python 3, ffmpeg/ffprobe, curl |
| 기본 포트 | HTTP/WebRTC `8080`, RTSP `8554` |
| 기본 route/file root | RTSP route `dhseo`, file root `video/` |

권장 준비 명령:

```bash
./server.sh install
./server.sh build
```

`./server.sh install`은 로컬 의존성, ONNX Runtime, YOLO 모델/라벨,
로컬 env 파일을 준비합니다. 패키지별 수동 설치 명령은
[docs/development-guide.md](docs/development-guide.md)의 요구 환경을 봅니다.
AI 없이 스트리밍 경로만 빌드하려면 다음처럼 실행합니다.

```bash
MEDIA_SERVER_ENABLE_AI=0 ./server.sh build
```

기본 인증 모드는 `MEDIA_SERVER_AUTH_MODE=auto`입니다.
users file 또는 `admin.passwordHash`가 없으면 첫 접속 시 `/setup`으로 이동해
관리자 비밀번호를 직접 설정합니다. 제품 기본 admin 비밀번호는 없습니다.

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

## 문서 로드맵

| 먼저 보고 싶은 것 | 문서 |
| --- | --- |
| 실행 환경, 설치, 빌드, foreground/background 실행 | [docs/development-guide.md](docs/development-guide.md) |
| Auth/Ops/Client 화면 구조와 사용 흐름 | [docs/ui-guide.md](docs/ui-guide.md) |
| 환경변수, auth mode, port, registry, 운영 preset | [docs/config-reference.md](docs/config-reference.md) |
| RTSP/WebRTC pipeline, source/session, VA layer 배치 | [docs/media-server-architecture.md](docs/media-server-architecture.md) |
| YOLO, tracking, scenario, EventRecord, evidence 정책 | [docs/video-analysis.md](docs/video-analysis.md) |
| 현재 검증 기준과 실행 명령 | [docs/stream-verification.md](docs/stream-verification.md) |
| 운영 백업/복구 대상과 복구 후 검증 | [docs/ops-backup-recovery.md](docs/ops-backup-recovery.md) |
| Loitering/ZoneOccupancy 현장 시작 threshold | [docs/analysis-threshold-baselines.md](docs/analysis-threshold-baselines.md) |
| 남은 작업과 후속 로드맵 | [docs/development-backlog.md](docs/development-backlog.md) |
| 완료된 개발/검증 이력 | [docs/history/development-history.md](docs/history/development-history.md), [docs/history/verification-history.md](docs/history/verification-history.md) |
| YouTube import/source 실험 기능 | [docs/youtube-import.md](docs/youtube-import.md) |

README는 제품 경계와 실행 흐름만 유지합니다.
세부 구현 상태와 후속 로드맵은 위 문서에서 나눠 봅니다.

## 대표 UI 미리보기

README에는 전체 흐름이 바로 읽히는 대표 제품 화면만 배치합니다.
개발 진단과 분석 편집 상세는 [docs/ui-guide.md](docs/ui-guide.md)에서 따로 다룹니다.

**Ops Home**

![운영 홈](docs/assets/ui/ops-home.png)

**운영 채널 관리**

![운영 채널 관리](docs/assets/ui/ops-channels.png)

**운영 룰 관리**

![운영 룰 관리](docs/assets/ui/ops-rules.png)

**룰 영상/영역 편집**

![룰 영상/영역 편집](docs/assets/ui/ops-rules-preview.png)

**운영 사용자 관리**

![운영 사용자 관리](docs/assets/ui/ops-users.png)

**클라이언트 라이브**

![클라이언트 라이브](docs/assets/ui/client-live.png)

채널 화면에서는 아래 두 입력을 분리해 설명합니다.

- `외부 WHEP pull`: 외부 playback endpoint를 서버 pull source로 등록
- `Published WebRTC source`: 외부 URL이 아니라 내부 `/whip/publish`로 먼저 등록된 `sourceId` 연결

## 대표 접속 URL

실제 host/port는 `./server.sh status`와 `./server.sh urls` 출력값을 우선합니다.

| 용도 | 예시 |
| --- | --- |
| Root entry | `http://127.0.0.1:8080/` |
| 최초 관리자 설정 | `http://127.0.0.1:8080/setup` |
| 로그인 | `http://127.0.0.1:8080/login` |
| 운영 콘솔 | `http://127.0.0.1:8080/ops` 또는 `/ops/home` |
| 운영 Dashboard UI | `http://127.0.0.1:8080/ops/dashboard` |
| 운영 채널/룰/사용자 관리 | `http://127.0.0.1:8080/ops/sources`, `/ops/rules`, `/ops/users` |
| 클라이언트 포털 | `http://127.0.0.1:8080/client` 또는 `/client/live` |
| 클라이언트 Dashboard UI | `http://127.0.0.1:8080/client/dashboard` |
| 개발/검증 API | `/lab/analysis/*`, `/lab/files`, `/lab/reports` |
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
- `/lab`, `/lab/rules`, `/lab/import` 화면 route는 404로 닫고 제품 화면에서는 노출하지 않습니다.
- `/webrtc/test` 초기 브라우저 테스트 화면도 404로 닫고 제품 화면에서는 노출하지 않습니다.
- `/ops` 변경 API는 `source:write`가 필요합니다.
- `/lab/analysis/*` rule/profile 변경 API는 `rule:write`가 필요합니다.
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

## 영상 분석 사용 흐름

1. `/ops/rules`에서 분석 프로파일과 이벤트 템플릿을 먼저 준비합니다.
2. 채널 분석 설정을 추가하고 채널, 이벤트 템플릿, 분석 프로파일을 선택합니다.
3. 선택한 채널 미리보기 위에서 polygon 제한구역 또는 line crossing 선을 지정합니다.
4. 저장하면 숫자 기반 `vaRule` ID가 배정됩니다.
5. `/client/live`에서 실시간 스트리밍, `va=1`, `vaRule=<id>` 모드로 확인합니다.
6. `/ops/dashboard`에서 runtime 요약을 보고, 세부 metadata/backpressure/scenario/event 진단 상태는 `/lab/analysis/*` API로 확인합니다.
7. WebRTC 메타데이터는 `verify-webrtc-va-metadata` 또는 custom client에서 `vaMetadata=1` DataChannel로 확인합니다.
8. 외부 RTSP 클라이언트에서는 `?va=1` 또는 `?vaRule=<id>` server-side overlay URL을 사용합니다.

RTSP 일반 viewer는 WebRTC DataChannel metadata를 표시하지 않습니다.
custom client가 metadata를 따로 소비해야 할 때는
RTSP raw stream과 SSE/WS metadata side-channel을 별도로 조합합니다.
자세한 정책은 [docs/ui-guide.md](docs/ui-guide.md)와
[docs/video-analysis.md](docs/video-analysis.md)를 봅니다.

## 현재 제품 경계

- 운영자는 `/ops`에서 채널, 룰, 사용자, 대시보드 진단을 관리합니다.
- Viewer는 `/client`에서 할당된 PublishedView만 봅니다. source 원본 URL, 내부 진단 JSON, rule/profile editor는 노출하지 않습니다.
- EventRecord와 snapshot/clip은 이벤트 기반 짧은 증거 기록 범위입니다. MP4/VMS/NVR형 장기 녹화가 아닙니다.
- `/lab/analysis/*`는 API/검증용으로 유지하지만 `/lab`, `/lab/rules`, `/lab/import` 화면 route는 제품 UI에서 닫습니다.
- Re-ID 기본 기능화, 운영 TURN relay/auth, 외부 WHEP credential 저장 정책, 장기 soak/부하 검증은 별도 후속 범위입니다.

세부 구현 상태와 남은 작업은 [docs/development-backlog.md](docs/development-backlog.md)에서 관리합니다.

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
./server.sh verify-ops-click-e2e
./server.sh verify-ops-tables-layout
./server.sh verify-rule-ui
./server.sh verify-ops-rules-roundtrip
./server.sh verify-analysis-state
```

`verify-auth-routes`는 격리 서버를 직접 띄웁니다.
`verify-ops-client-ui`, `verify-rule-ui`는 실행 중인 HTTP 서버에 붙는 UI smoke이고,
`verify-ops-click-e2e`, `verify-ops-tables-layout`, `verify-ops-rules-roundtrip`은
같은 서버에 붙는 실제 클릭/반응형 테이블/API round-trip smoke입니다.

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
./server.sh verify-ops-backup-restore-dry-run
./server.sh verify-ops-evidence-retention-cleanup
./server.sh verify-rc-release-gate
```

로컬 QA, 수동 smoke, 자동 auth smoke의 표준 테스트 계정 비밀번호는 `qweasd0-`로 통일합니다. 이 값은 테스트 재현성을 위한 규칙이며, 제품 기본 admin 비밀번호를 의미하지 않습니다.

현재 검증 기준은 [docs/stream-verification.md](docs/stream-verification.md)에 정리되어 있습니다.

## 라이선스/배포 주의

- YOLO model, label, 외부 영상 source는 각 라이선스와 사용 권한을 별도로 확인해야 합니다.
- YouTube source/import는 개발/검증용 기능이며 운영 기본 기능이 아닙니다.
- EventRecord는 active/archive 조회, compaction snapshot 관리, 짧은 snapshot/clip frame evidence recorder 중심입니다. MP4/VMS/NVR형 장기 녹화, Re-ID/appearance 기본 기능화는 개인정보와 보관 정책 검토가 필요합니다.
- 외부 HTTP/HLS URI, 외부 WHEP URL pull source, 운영 TURN relay/auth는 네트워크와 credential 상태에 따라 별도 검증이 필요합니다. 인증 토큰이 필요한 WHEP endpoint credential 보관/주입은 아직 별도 운영 정책 대상입니다.
