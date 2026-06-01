# Media Server

[![Preflight](https://github.com/dhseo90/MediaServer/actions/workflows/preflight.yml/badge.svg?branch=main)](https://github.com/dhseo90/MediaServer/actions/workflows/preflight.yml)
[![Licensing and Artifact Guardrails](https://github.com/dhseo90/MediaServer/actions/workflows/licensing-artifact-guardrails.yml/badge.svg?branch=main)](https://github.com/dhseo90/MediaServer/actions/workflows/licensing-artifact-guardrails.yml)
[![Release](https://img.shields.io/badge/release-v2.0.0-blue)](https://github.com/dhseo90/MediaServer/releases/tag/v2.0.0)

RTSP/WebRTC live stream을 받아 다시 내보내고, 필요할 때 YOLO/ONNX 영상 분석
overlay와 Rule/Scenario live event를 붙이는 C++17 미디어 서버입니다.

현재 제품 경계는 **live source onboarding, live source health, live VA event 품질**입니다.
장기 녹화, VMS/NVR, playback/search, runtime/model bundle 배포는 기본 release 범위가
아닙니다.

- English documentation: [README.en.md](README.en.md), [docs/en/README.md](docs/en/README.md)
- 전체 문서 색인: [docs/README.md](docs/README.md)
- 현재 릴리즈: [v2.0.0](https://github.com/dhseo90/MediaServer/releases/tag/v2.0.0)

## 한눈에 보기

- **스트리밍**: file, RTSP pull, WHEP pull, WHIP publish, HTTP/HLS source를 RTSP와 WebRTC/WHEP로 내보냅니다.
- **영상 분석**: `va=1` overlay, 저장 룰 `vaRule=<id>`, Rule/Profile/Scenario, live Event POST와 runtime metadata를 제공합니다.
  EventRecord와 snapshot/clip은 short event evidence 보조 기능이며 현재 중심 제품 메시지는 아닙니다.
- **VLM 리뷰 보조**: Ops 이벤트 검토에서 VLM 기반 설명, 오탐 힌트, 추천 후보를 보조 정보로 다룹니다.
  VLM model/runtime bundle과 cloud provider 실제 호출은 기본 release에 포함하지 않습니다.
- **제품 화면**: 같은 메인 주소에서 계정 권한에 따라 운영자 화면 또는 클라이언트 화면으로 이동합니다.
  검증/연동 API는 제품 화면과 분리해 유지합니다.
- **계정/권한**: 최초 관리자 설정, session 로그인, role/scope, admin 사용자 관리, viewer invite/request 승인 흐름을 사용합니다.
- **검증**: UI/Auth smoke, VA replay, runtime state, 백업/복구 리허설, RC gate artifact 검증 명령을 `./server.sh`에서 제공합니다.
  장기 soak/부하 검증은 기본 smoke와 분리해 [docs/stream-verification.md](docs/stream-verification.md)의 longrun gate 기준으로만 다룹니다.
- **배포 경계**: source/doc 중심 공개가 기본이며, binary/runtime/model bundle은 별도 guardrail 통과 전까지 제공하지 않습니다.

## VLM 리뷰 보조

v2.0.0은 VLM을 최종 판정 엔진이 아니라 운영자 이벤트 리뷰 보조 계층으로 추가합니다.
YOLO/Rule/Scenario가 만든 이벤트에 대해 설명, 오탐 가능성 힌트, evidence 요약,
Rule 추천 후보를 제공하고, 기존 Event POST/WebRTC/SSE/WS schema와 media path는 유지합니다.

모델 선택 기준은 PC 사양과 privacy mode를 함께 봅니다. 현재 기준은 local standard
`Qwen/Qwen3-VL-8B-Instruct`, low-spec fallback `Qwen/Qwen3-VL-4B-Instruct`,
high-tier 평가 후보 `Qwen/Qwen3-VL-30B-A3B-Instruct`, cloud opt-in fallback
`gemini-2.5-flash`입니다. 실제 모델/runtime 설치, cloud provider 호출,
model/runtime bundle 배포는 기본 release에 포함하지 않습니다.

상세 기준:

- 모델 선택: [docs/vlm-model-selection.md](docs/vlm-model-selection.md)
- PC 사양별 추천 엔진: [docs/vlm-recommendation-engine.md](docs/vlm-recommendation-engine.md)
- 설치/연결 dry-run: [docs/vlm-install-connection-dry-run.md](docs/vlm-install-connection-dry-run.md)
- 운영 UI 리뷰 흐름: [docs/vlm-ops-event-review-ui.md](docs/vlm-ops-event-review-ui.md)

## 실행 환경

| 구분 | 기준 |
| --- | --- |
| OS | macOS 또는 Linux |
| 언어/빌드 | C++17, CMake 3.16+ |
| 미디어 런타임 | GStreamer 1.0, gst-rtsp-server, WebRTC 관련 GStreamer plugin |
| 선택 AI | ONNX Runtime, YOLO ONNX model, label file |
| 보조 도구 | Node.js, Python 3, ffmpeg/ffprobe, curl |
| 기본 route/file root | RTSP route `dhseo`, file root `video/` |

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

브라우저 접속:

```text
http://127.0.0.1:8081/
```

다른 포트로 실행한 경우에는 `./server.sh status`의 HTTP 주소를 사용합니다.

## Sample/Asset 범위

추적되는 `video/*.mp4`와 allowlist된 `video/imports/va_tracking_event_1280x720_30fps_h264.mp4`는
검증 재현을 위해 생성한 sample fixture입니다. 운영/고객 영상, evidence media, YOLO model binary,
FFmpeg/GStreamer runtime binary는 public repo 또는 기본 release asset에 포함하지 않습니다.
fixture별 공개 판단은 [docs/sample-fixture-provenance.md](docs/sample-fixture-provenance.md)에 기록합니다.

## 문서 길잡이

README는 제품을 빠르게 파악하기 위한 문서입니다. 세부 정책, 검증 이력, release 증적은
전용 문서로 분리합니다.

- 전체 색인: [docs/README.md](docs/README.md)
- 설치/빌드/실행: [docs/development-guide.md](docs/development-guide.md)
- 운영자/클라이언트 UI: [docs/ui-guide.md](docs/ui-guide.md)
- RTSP/WebRTC/VA 구조: [docs/media-server-architecture.md](docs/media-server-architecture.md)
- 영상 분석과 scenario: [docs/video-analysis.md](docs/video-analysis.md)
- 검증 명령: [docs/stream-verification.md](docs/stream-verification.md)
- release/version 기준: [docs/release-policy.md](docs/release-policy.md),
  [docs/versioning-policy.md](docs/versioning-policy.md)
- release roadmap/archive: [docs/development-backlog.md](docs/development-backlog.md)
- release notes: [v2.0.0](https://github.com/dhseo90/MediaServer/releases/tag/v2.0.0)

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
- `Published WebRTC 소스`: 외부 URL이 아니라 내부 `/whip/publish`로 먼저 등록된 `sourceId` 연결

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

## 계정별 화면

- 최초 실행 또는 계정 저장소가 비어 있으면 관리자 비밀번호 설정 화면으로 이동합니다.
- `admin`과 `operator`는 운영 화면에서 채널, 룰, 사용자, 대시보드 진단을 봅니다.
- `viewer`는 할당된 클라이언트 화면만 봅니다. 원본 source URL, 내부 진단 JSON, rule/profile editor는 노출하지 않습니다.
- `integrator`는 화면 사용보다 scoped API 연동을 기준으로 합니다.

세부 화면 구조와 권한 경계는 [docs/ui-guide.md](docs/ui-guide.md)에서 관리합니다.

## 테스트 요약

가장 넓은 기본 회귀:

```bash
./server.sh test
```

문서나 release metadata만 바꾼 경우에는 빠른 검증을 우선합니다.

```bash
git diff --check
./server.sh verify-release-metadata
./server.sh verify-docs-links
```

main/tag/GitHub Release publish 이후에는 GitHub Latest Release와 원격 tag까지
확인하는 `./server.sh verify-release-metadata --published`를 실행합니다.

release 전 로컬 기준선:

```bash
./server.sh test --full
```

기능 개발 전후 안정화 묶음은 별도 명시 후 실행합니다.

```bash
./server.sh verify-predev --quick
```

UI/Auth/VA/장기 soak 검증의 전체 명령과 실행 조건은
[docs/stream-verification.md](docs/stream-verification.md)에 정리되어 있습니다.
실장비 endpoint, 외부 credential, 고객/운영 영상 URL은 문서와 artifact에 남기지 않습니다.

## 라이선스

기본 기준:

- 이 저장소의 원본 코드와 문서는 [Apache License 2.0](LICENSE)을 따릅니다.
- Third-party runtime, plugin, model, tool attribution은 [NOTICE](NOTICE)에 정리합니다.
- 자동 생성되는 상세 목록은 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)를 확인합니다.

배포 전 확인:

- 배포 bundle과 container image 정책은 [docs/distribution-policy.md](docs/distribution-policy.md)를 확인합니다.
- 보안 제보와 기여 기준은 [SECURITY.md](SECURITY.md), [CONTRIBUTING.md](CONTRIBUTING.md)를 확인합니다.
