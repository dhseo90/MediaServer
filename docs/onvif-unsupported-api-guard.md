# ONVIF Unsupported API Guard

이 문서는 v1.8.0 ONVIF 범위 밖 protocol이 제품 API/UI로 열리지 않도록 하는
guard 기준을 v1.9.0 release baseline에서도 유지합니다. 현재 ONVIF 관련 제품 흐름은
live source 등록 draft와 `/ops/sources` 수동 URI 저장에 한정합니다.

관련 기준:

- [ONVIF Protocol Support Matrix](./onvif-protocol-support-matrix.md)
- [ONVIF Live Source Support](./onvif-live-source-support.md)

## 허용 API

현재 ONVIF 전용으로 허용된 API 경계:

```text
POST /ops/api/onvif/import-draft
```

이 endpoint는 fixture나 redacted probe result를 기존 SourceRegistry/PublishedView
draft로 축약할 뿐, 장비 제어, 녹화, replay, 이벤트 구독을 수행하지 않습니다.

## 열지 않는 API

아래 route/API/UI는 v1.8.0에서 제외했고 v1.8.0 기준 ONVIF live source 범위에도
포함하지 않습니다.

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

## Negative Route Matrix

비지원 route의 HTTP 상태는
`test/fixtures/onvif_unsupported_api_negative_routes.json`에 고정합니다.

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

```bash
./server.sh verify-onvif-unsupported-api-guard
./server.sh verify-onvif-unsupported-api-guard --http-base http://127.0.0.1:8081 --exercise-routes
./server.sh verify-onvif-protocol-support-matrix
git diff --check
```
