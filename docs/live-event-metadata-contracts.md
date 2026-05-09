# Live Event and Metadata Contracts

이 문서는 v1.1.0의 live event delivery contract를 분리해 정리합니다.
기존 Event POST payload, WebRTC DataChannel schema, SSE/WS runtime metadata
schema를 변경하지 않고, 각 소비 경로의 역할과 검증 기준을 한곳에 모읍니다.

관련 기준:

- [v1.1.0 Roadmap](./v1.1.0-roadmap.md)
- [Video Analysis / VA Guide](./video-analysis.md)
- [Stream Verification](./stream-verification.md)

## Contract Boundary

MediaServer의 v1.1.0 event/metadata contract는 저장 영상이 아니라 live event와
runtime metadata 소비를 기준으로 합니다.

포함:

- Event POST live event delivery
- WebRTC DataChannel VA metadata
- SSE runtime metadata side-channel
- WebSocket runtime metadata side-channel과 subscription control
- metadata filter preset과 include/limit option
- delivery failure/drop/backpressure metric 요약

비범위:

- recorded evidence API를 주요 integration contract로 승격
- EventRecord storage schema 변경
- OpenAPI 기반 VMS archive/playback API
- WebRTC/SSE/WS/Event POST payload field 변경을 동반한 기능 확장

## Event POST

역할:

- live rule/scenario event를 외부 HTTP endpoint로 전달합니다.
- EventRecord storage와 별도입니다.
- dispatcher 실패는 media pipeline 실패로 전파하지 않습니다.

계약:

- 기존 event payload는 `media-server.va.event.v1` 계열 event JSON을 유지합니다.
- 기존 Intrusion/LineCrossing event type과 scenario event type을 변경하지 않습니다.
- storage rotation/recovery나 short evidence hook이 추가되어도 POST payload field를
  바꾸지 않습니다.

검증:

```bash
./server.sh verify-event-post --mode schema
./server.sh verify-event-post --mode recovery
```

Event POST가 기본 서버에서 비활성인 경우에는 Event POST enabled 보정 서버로
schema/recovery를 재확인합니다. 비활성 상태 자체를 제품 회귀로 단정하지 않습니다.

## WebRTC DataChannel Metadata

역할:

- WebRTC browser viewer가 video/audio stream과 별도로 VA metadata를 받습니다.
- Lab viewer의 client-side canvas overlay가 이 metadata를 사용할 수 있습니다.

계약:

- schema는 `media-server.webrtc.va-metadata.v1`을 유지합니다.
- DataChannel label 기본값은 `va-metadata`입니다.
- `tracks[]`, `events[]`, sync 진단 필드를 기존 호환 범위 안에서 사용합니다.
- dashboard 전용 내부 필드를 WebRTC 외부 schema에 추가하지 않습니다.
- DataChannel 생성/전송 실패가 WebRTC audio/video streaming 실패로 전파되면 안 됩니다.

검증:

```bash
./server.sh verify-webrtc-va-metadata --http-base http://127.0.0.1:8080
```

확인 기준:

- video track 수신
- ICE connected
- `va-metadata` DataChannel open
- 최소 1개 metadata message 수신
- DataChannel 지연/오류가 영상 재생 실패로 전파되지 않음

## SSE Runtime Metadata

역할:

- RTSP 일반 client나 custom dashboard가 RTSP video와 별도로 runtime metadata를
  소비할 수 있게 합니다.

Endpoint:

```text
GET /lab/analysis/taps/{tapId}/metadata/stream
GET /lab/analysis/metadata/stream?vaRule=<id>
```

계약:

- message event payload는 `media-server.va.runtime-metadata.v1`입니다.
- 같은 frame metadata는 반복 전송하지 않고 heartbeat/stale comment로 연결 상태를
  유지합니다.
- `intervalMs`, `maxMessageBytes`, `maxTracks`, `maxEvents`로 전송량을 제한합니다.
- SSE 연결 실패나 client disconnect는 RTSP/WebRTC media pipeline 실패로
  전파하지 않습니다.
- Auth on에서는 admin/operator 또는 `lab:read` scope가 필요합니다.

검증:

```bash
./server.sh verify-va-metadata-sidechannel --http-base http://127.0.0.1:8080
```

수동/custom client 확인:

```bash
python3 scripts/examples/va_metadata_sse_client.py \
  --url 'http://127.0.0.1:8080/lab/analysis/metadata/stream?vaRule=1&intervalMs=500&maxMessageBytes=65536' \
  --max-messages 5 \
  --timeout-seconds 15
```

## WebSocket Runtime Metadata

역할:

- SSE와 같은 runtime metadata payload를 WebSocket text frame으로 전달합니다.
- client command로 subscribe/unsubscribe/resume/reset/status를 제어합니다.

Endpoint:

```text
WS /ws/va-metadata?tapId=<id>
WS /ws/va-metadata?vaRule=<id>
WS /ws/va-metadata?file=sample_h264.mp4
```

계약:

- message text frame payload는 `media-server.va.runtime-metadata.v1`입니다.
- control ack는 `media-server.va.metadata-control.v1`입니다.
- query filter/include flag를 초기 구독값으로 적용합니다.
- subscribe command는 filter/include/limit를 갱신하고 ack를 반환합니다.
- `maxClients`로 동시 metadata WebSocket client 수를 제한합니다.
- WebSocket handshake/stream 실패는 RTSP/WebRTC media pipeline 실패로
  전파하지 않습니다.
- 기존 WebRTC DataChannel schema와 Event POST payload는 변경하지 않습니다.

검증:

```bash
./server.sh verify-ws-metadata --http-base http://127.0.0.1:8080
```

## Shared Rules

- source locator, ONVIF endpoint, credential reference는 client/viewer contract에
  포함하지 않습니다.
- runtime metadata filter는 schema 변경 없이 `tracks[]`, `events[]`,
  `scenarios[]`, metric/include 범위를 줄이는 방식으로만 적용합니다.
- DataChannel/SSE/WS/Event POST failure는 metric/log로 남기고 media forwarding을
  계속 유지합니다.
- payload/schema 변경이 필요한 요구사항은 v1.1.0 live-only scope와 별도 schema
  review로 분리합니다.

## Verification Matrix

| 변경 범위 | 최소 검증 |
| --- | --- |
| 문서만 변경 | `git diff --check -- README.md docs`, `./server.sh verify-docs-links` |
| Event POST contract | `./server.sh verify-event-post --mode schema` |
| WebRTC DataChannel | `./server.sh verify-webrtc-va-metadata` |
| SSE side-channel | `./server.sh verify-va-metadata-sidechannel` |
| WebSocket side-channel | `./server.sh verify-ws-metadata` |
| Runtime dashboard/metadata fanout | `./server.sh verify-va-runtime-console`, `./server.sh verify-va-metadata-sidechannel`, `./server.sh verify-ws-metadata` |
