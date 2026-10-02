# ONVIF API 허용 범위와 미지원 기능 차단

독자는 ONVIF API를 변경·검증하는 개발자다. 현행 route와 미지원 기능의 경계를
설명하며 실행 결과를 기록하는 문서는 아니다. 실제 route·권한 기준은
[HTTP 라우터](../src/ingress/webrtc_http_server_runtime.cpp), 저장은
[채널·뷰 registry](../src/ingress/source_view_registry.cpp)를 함께 대조한다.

관련 기준:

- [ONVIF Protocol Support Matrix](./onvif-protocol-support-matrix.md)
- [ONVIF Live Source Support](./onvif-live-source-support.md)

## 허용 API

| Method / route | 하는 일 | 권한·쓰기 경계 |
| --- | --- | --- |
| `POST /ops/api/onvif/import-draft` | fixture/probe 결과를 `sourceDraft`·`publishedViewDraft`로 축약 | Ops 접근과 `source:write`; 초안만 반환하며 저장하지 않음 |
| `PUT /ops/api/onvif/channels/{channelId}` | 사용자가 확인한 채널과 뷰의 쌍 저장 | Ops 접근과 `source:write`; 실패 시 보상 복구, 복구 실패는 `manual-recovery-required`로 보고 |
| `GET /ops/api/onvif/live-import-persist-decision` | 초안 적용→명시 저장의 정책 안내 | Ops 읽기 전용; 이 조회 자체는 저장하지 않음 |
| `GET /ops/api/onvif/credential-provider-status` | 정제된 provider 준비 상태 | Ops 읽기 전용; credential 원문이나 실제 인증 성공을 반환하지 않음 |

이는 카메라 제어 API가 아니다. 네 route는 카메라의 녹화·replay·이벤트 구독을
수행하지 않는다. MediaServer 자체의 녹화 기능과 ONVIF Profile G 지원도 구분한다.
`/ops/sources`의 입력·초안 검토·저장 흐름은 [라이브 입력 안내](./onvif-live-source-support.md)를 따른다.

## 열지 않는 API

아래 route/API/UI는 현재 지원하지 않는다.

```text
/ops/api/onvif/discover
/ops/api/onvif/ptz
/ops/api/onvif/events
/ops/api/onvif/pullpoint
/ops/api/onvif/recording
/ops/api/onvif/replay
/ops/api/onvif/analytics
/ops/api/onvif/imaging
/ops/api/onvif/device-management
```

비지원 항목:

- WS-Discovery 자동 검색
- PTZ pan/tilt/zoom, preset, move/stop control
- ONVIF Events subscription, PullPoint, topic mapping
- Profile G, Recording, Replay, playback/search
- camera-side Analytics service
- Imaging service
- Device management

## 미지원 경로의 오류 응답

비지원 route의 HTTP 상태는
`test/fixtures/onvif_unsupported_api_negative_routes.json`에 고정합니다.
이는 미지원 경로와 import method 오류를 위한 fixture이며, 모든 현행 허용 API의 목록은 아니다.
인증·권한 선수조건이 충족된 요청의 route 오류를 정의하며, 미인증·권한 거부 응답을 대체하지 않는다.

- 허용 route인 `/ops/api/onvif/import-draft`는 `POST`만 허용합니다.
- `/ops/api/onvif/import-draft`의 `GET`, `PUT`은 `405 method not allowed`입니다.
- WS-Discovery, PTZ, Events, PullPoint, Recording, Replay, Analytics, Imaging,
  Device management route는 열지 않으며 `POST` smoke 기준 `404 not found`입니다.
- negative route 응답은 credential reference, stream URI, raw SOAP를 노출하지
  않습니다.

## 향후 추가 조건

범위 밖 API를 추가하려면 별도 단계에서 아래 조건을 만족해야 합니다.

1. API route, method, request/response schema를 문서화합니다.
2. auth role/scope guard를 먼저 정의합니다.
3. credential reference와 redaction policy를 확장합니다.
4. event payload, SSE/WS metadata, WebRTC DataChannel, RTSP/WebRTC media path와
   충돌하지 않는지 검증합니다.
5. client/viewer 화면에는 source URL, endpoint, credential, raw SOAP, raw JSON을
   노출하지 않습니다.
6. 실장비 성공 smoke와 no-device fixture smoke를 분리해서 보고합니다.

## 검증

기본 명령은 문서·소스·fixture 정적 검사다. `--exercise-routes`를 명시한 경우에만
준비된 격리 서버로 negative route HTTP 요청을 보낸다. 둘 모두 실제 장치 호환성이나
UI 풀테스트의 통과를 뜻하지 않는다. 쌍 저장·provider 상태는 별도 기능 검사로 확인한다.

```bash
./server.sh verify-onvif-unsupported-api-guard
./server.sh verify-onvif-unsupported-api-guard --http-base http://127.0.0.1:8081 --exercise-routes
./server.sh verify-onvif-protocol-support-matrix
./server.sh verify-v390-onvif-source-view-atomicity
./server.sh verify-v390-onvif-credential-provider-status
git diff --check
```
