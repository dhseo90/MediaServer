# WebRTC VA Metadata Client

이 문서는 WebRTC `va-metadata` DataChannel을 custom browser client에서
소비할 때의 최소 contract와 예제를 분리해 정리합니다.

관련 기준:

- [Live Event and Metadata Contracts](./live-event-metadata-contracts.md)
- [Video Analysis / VA Guide](./video-analysis.md)
- [Stream Verification](./stream-verification.md)
- [browser example](../scripts/examples/webrtc_va_metadata_client.html)

## Scope

이 예제는 generic `/webrtc/session`을 사용하는 Lab/operator integration 참고용입니다.
Auth on에서는 admin/operator 또는 `lab:read` scope가 필요합니다.
viewer/client 제품 흐름은 `/client/api/views/{viewId}/webrtc/session` wrapper를
사용하며 source locator, raw debug JSON, internal session id를 노출하지 않습니다.

포함:

- WebRTC video track 수신
- `vaMetadata=1` DataChannel 활성화
- DataChannel label `va-metadata` 확인
- `media-server.webrtc.va-metadata.v1` payload parse
- `tracks[]`, `events[]`, sync diagnostic field 확인

비범위:

- RTSP 일반 viewer overlay
- Event POST payload 변경
- SSE/WS runtime metadata schema 변경
- client/viewer 화면에 source URL이나 debug JSON 노출

## Session Flow

```text
Browser custom client
  -> GET /webrtc/config
  -> POST /webrtc/session?file=<token>&va=1&vaMetadata=1
  <- { sessionId, offer }
  -> RTCPeerConnection.setRemoteDescription(offer)
  -> RTCPeerConnection.createAnswer()
  -> POST /webrtc/session/{sessionId}/answer
  -> POST /webrtc/session/{sessionId}/ice
  <- DataChannel(label=va-metadata)
  <- JSON message schema=media-server.webrtc.va-metadata.v1
```

Query options commonly used by custom clients:

| Query | Purpose |
| --- | --- |
| `va=1` | VA analysis/overlay path 활성화 |
| `vaMetadata=1` | WebRTC DataChannel metadata 활성화 |
| `vaMetadataIntervalMs=500` | metadata publish interval |
| `vaMetadataMaxMessageBytes=65536` | message size guard |
| `vaMetadataMaxBufferedBytes=<bytes>` | DataChannel buffered amount guard |

## Payload Contract

Top-level fields:

- `schema`: `media-server.webrtc.va-metadata.v1`
- `streamId`, `channelId`, `profileKey`
- `frameId`, `pts`, `timestampMs`
- `videoFramePtsMs`, `analysisPtsMs`, `syncDeltaMs`
- `syncStatus`, `syncToleranceMs`
- `metadataSequence`, `sentAtMs`
- `frameWidth`, `frameHeight`, `coordinateSpace`
- `tracks[]`
- `events[]`

`tracks[]` is normalized to the source frame. `bbox` uses
`coordinateSpace=normalized-frame` and `[0, 1]` coordinates. Browser overlays
must convert this to displayed video pixels using the current video element size
and letterbox offset.

`events[]` carries live rule/scenario event summaries. Event POST keeps its own
`media-server.va.event.v1` payload and is not changed by this DataChannel schema.

## Browser Example

The standalone example is:

```text
scripts/examples/webrtc_va_metadata_client.html
```

Run it from the same origin as the media server or from a local development
origin allowed by your environment. Opening it directly with `file://` can fail
because browsers send a `null` origin for WebRTC signaling requests.

Minimal checks in the example:

- `RTCPeerConnection` reaches connected/completed ICE state
- video track arrives through `ontrack`
- DataChannel label is `va-metadata`
- metadata payload parses as JSON
- `schema` equals `media-server.webrtc.va-metadata.v1`
- `tracks` and `events` are arrays
- sync diagnostic fields are displayed separately from payload body

## Failure Policy

DataChannel creation, parse, buffer, or send failures are metadata failures only.
They must not be treated as RTSP/WebRTC audio/video path failures unless the
media path itself fails. Server-side verification for this rule is:

```bash
./server.sh verify-webrtc-va-metadata --http-base http://127.0.0.1:8080
```

If this command is not run, report WebRTC metadata client schema/example as
documented but do not claim runtime delivery was manually verified.
