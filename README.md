# Media Server

RTSP/WebRTC 스트림을 중계하고, 선택적으로 YOLO/ONNX 기반 영상 분석 overlay와 Rule/Scenario 이벤트를 붙이는 C++17 미디어 서버입니다.

## 핵심 요약

- RTSP/WebRTC 미디어 중계: RTSP output, WebRTC signaling/WHEP output, WHIP publish source 1차 경로를 지원합니다.
- Source: file, RTSP pull, WebRTC publish, HTTP/HLS URI source를 같은 stream/session 구조에서 다룹니다.
- VA overlay: `va=1`로 YOLO/ONNX detection overlay를 요청할 수 있습니다.
- 영상 분석 UI: Rule/Profile/Scenario, 객체 category, polygon/line, event action을 `/lab/rules`에서 설정합니다.
- 저장 설정 호출: 숫자 ID 기반 `vaRule=<id>`로 저장된 source/profile/rule/scenario를 호출합니다.
- VA Metadata Runtime Console: WebRTC 메타데이터 뷰어, 브라우저 client-side overlay, drill-down 런타임 대시보드, vaRule debug, SSE/WS side-channel, custom SSE client와 Custom RTSP+SSE overlay 예제를 제공합니다.
- 이벤트/검증: Event POST, EventRecord JSON Lines 저장, VA metadata replay/baseline 검증 구조를 제공합니다.

## 대표 UI 미리보기

**룰 목록과 저장된 vaRule 관리**

![영상 분석 룰 목록](docs/assets/ui/analysis-rule-list.png)

**영상 프레임을 보며 영역/라인 설정**

![영상 분석 영역 캔버스](docs/assets/ui/analysis-region-canvas.png)

**영상 분석 테스트/미리보기**

![영상 분석 보기](docs/assets/ui/analysis-preview.png)

상세 화면 설명은 [docs/ui-guide.md](docs/ui-guide.md)를 봅니다.

## 전체 Pipeline

```text
File / RTSP Pull / WebRTC Publish / HTTP-HLS URI
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
| 운영 콘솔 | `http://127.0.0.1:8080/ops/live` |
| 클라이언트 포털 | `http://127.0.0.1:8080/client/live` |
| Lab | `http://127.0.0.1:8080/lab` |
| 영상 분석 관리 | `http://127.0.0.1:8080/lab/rules` |
| RTSP | `rtsp://127.0.0.1:8554/dhseo?file=sample_h264.mp4` |
| WebRTC signaling | `POST http://127.0.0.1:8080/webrtc/session?file=sample_h264.mp4` |
| WHEP | `POST http://127.0.0.1:8080/whep?file=sample_h264.mp4` |
| VA overlay | `rtsp://127.0.0.1:8554/dhseo?file=va_four_scene_sample.mp4&va=1` |
| 저장 VA 룰 | `rtsp://127.0.0.1:8554/dhseo?vaRule=1` |

## 영상 분석 사용 흐름

1. `/lab/rules`에서 영상 분석 설정 탭을 엽니다.
2. 룰을 추가하고 source, profile, 기본 event 또는 scenario를 선택합니다.
3. polygon 제한구역 또는 line crossing 선을 지정합니다.
4. 저장하면 숫자 기반 `vaRule` ID가 배정됩니다.
5. 영상 분석 보기 탭에서 실시간 스트리밍, `va=1`, `vaRule=<id>` 모드로 확인합니다.
6. Runtime Dashboard 탭에서 active analysis tap, metadata/backpressure, scenario/event/debug 상태를 확인합니다.
7. WebRTC 메타데이터 뷰어에서는 `vaMetadata=1` DataChannel과 browser client-side overlay를 확인합니다.
8. 외부 RTSP 클라이언트에서는 `?va=1` 또는 `?vaRule=<id>` server-side overlay URL을 사용합니다.

RTSP 일반 viewer는 WebRTC DataChannel metadata를 표시하지 않습니다. custom client가 metadata를 따로 소비해야 할 때는 RTSP raw stream과 SSE/WS metadata side-channel을 별도로 조합합니다. 자세한 정책은 [docs/ui-guide.md](docs/ui-guide.md)와 [docs/video-analysis.md](docs/video-analysis.md)를 봅니다.

## 시나리오 로드맵 상태

- 완료: Runtime Dashboard trend/stale/cleanup warning 1차, scenario rule payload의 runtime per-rule 설정 연결, ReEntry와 IntrusionAfterLineCrossing의 룰 편집 UI 선택/저장 템플릿, Auth Bootstrap과 기본 로그인 강제.
- 다음 작업: Loitering UI 템플릿과 ZoneOccupancyScenario 신규 구현.
- 후속 Phase: SourceRegistry / PublishedView 고도화, `/ops` / `/client` / `/lab` route 세부 분리, client/operator live portal 고도화, client scoped dashboard, analysis tap reuse / source+profile 공유 정책.

이 로드맵 정리는 기존 Event POST payload, WebRTC DataChannel schema, SSE/WS metadata schema, Scenario 판단 로직 변경을 의미하지 않습니다. snapshot/clip hook은 marker 중심의 후속 연결점이며 VMS/NVR 녹화 기능이 아닙니다.

## 테스트 요약

기본 회귀:

```bash
./server.sh test
```

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

VA Metadata Runtime Console 검증:

```bash
./server.sh verify-webrtc-va-metadata
./server.sh verify-va-runtime-console
```

현재 검증 기준은 [docs/stream-verification.md](docs/stream-verification.md)에 정리되어 있습니다.

## 문서 지도

| 문서 | 역할 |
| --- | --- |
| [docs/development-guide.md](docs/development-guide.md) | 빌드, 실행, 디버깅, 테스트 명령 |
| [docs/ui-guide.md](docs/ui-guide.md) | `/lab`, 영상 분석 설정/보기/Runtime Dashboard UI 사용법 |
| [docs/config-reference.md](docs/config-reference.md) | 환경변수와 주요 설정 reference |
| [docs/media-server-architecture.md](docs/media-server-architecture.md) | RTSP/WebRTC pipeline, stream/session, VA layer 배치 |
| [docs/video-analysis.md](docs/video-analysis.md) | YOLO, tracking, TrackState, scenario, replay, EventRecord |
| [docs/stream-verification.md](docs/stream-verification.md) | 현재 검증 기준과 실행 명령 |
| [docs/development-backlog.md](docs/development-backlog.md) | 현재 남은 작업과 후속 로드맵 |
| [docs/history/development-history.md](docs/history/development-history.md) | 완료된 개발 이력 |
| [docs/history/verification-history.md](docs/history/verification-history.md) | 과거 상세 검증 이력 |
| [docs/youtube-import.md](docs/youtube-import.md) | YouTube import/source 실험 기능 |

## 라이선스/배포 주의

- YOLO model, label, 외부 영상 source는 각 라이선스와 사용 권한을 별도로 확인해야 합니다.
- YouTube source/import는 실험실 기능이며 운영 기본 기능이 아닙니다.
- EventRecord, snapshot/clip hook, Re-ID/appearance 기능은 개인정보와 보관 정책 검토가 필요합니다.
- 외부 HTTP/HLS URI와 운영 TURN relay/auth는 네트워크와 credential 상태에 따라 별도 검증이 필요합니다.
