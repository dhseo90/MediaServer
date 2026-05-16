# Integrator Contract Artifact

이 문서는 v1.2.0 `Integrator contract artifact` 범위에서 외부 연동자가 받을 수
있는 배포 산출물의 위치와 검증 기준을 고정합니다. 기준 payload는
[Live Event and Metadata Contracts](./live-event-metadata-contracts.md)를 따르며,
이 산출물은 기존 Event POST, WebRTC DataChannel, SSE, WebSocket payload field를
추가하거나 삭제하지 않습니다. 즉, payload field를 추가하거나 삭제하지 않습니다.

상태: `1차 구현`

## Artifact Layout

기본 sample bundle:

```text
test/fixtures/integrator_contract_artifact/
  manifest.json
  schemas/
    event-post.schema.json
    webrtc-va-metadata.schema.json
    runtime-metadata.schema.json
    metadata-control.schema.json
  samples/
    event-post.json
    webrtc-va-metadata.json
    runtime-metadata-sse.json
    runtime-metadata-ws.json
    metadata-control-subscribe-ack.json
```

`manifest.json`의 schema는 `media-server.integrator-contract-artifact.v1`입니다.
각 payload sample은 실제 serializer의 현재 schema identifier를 그대로 사용합니다.

| 영역 | Identifier | Sample | Runtime 검증 |
| --- | --- | --- | --- |
| Event POST | `media-server.va.event.v1` | `samples/event-post.json` | `./server.sh verify-event-post --mode schema` |
| WebRTC DataChannel | `media-server.webrtc.va-metadata.v1` | `samples/webrtc-va-metadata.json` | `./server.sh verify-webrtc-va-metadata` |
| SSE runtime metadata | `media-server.va.runtime-metadata.v1` | `samples/runtime-metadata-sse.json` | `./server.sh verify-va-metadata-sidechannel` |
| WebSocket runtime metadata | `media-server.va.runtime-metadata.v1` | `samples/runtime-metadata-ws.json` | `./server.sh verify-ws-metadata` |
| WebSocket control ack | `media-server.va.metadata-control.v1` | `samples/metadata-control-subscribe-ack.json` | `./server.sh verify-ws-metadata` |

## Boundary

포함:

- 기존 Event POST payload의 `media-server.va.event.v1` sample과 JSON Schema
- 기존 WebRTC `va-metadata` DataChannel sample과 JSON Schema
- 기존 SSE/WS runtime metadata sample과 JSON Schema
- WebSocket subscribe/status/reset 계열 control ack sample과 JSON Schema
- artifact manifest와 정적 검증 명령

비범위:

- Event POST, WebRTC DataChannel, SSE/WS metadata payload field 추가/삭제
- schema identifier 또는 DataChannel label 변경
- EventRecord, snapshot, clip, evidence bundle을 주요 integration contract로 승격
- client/viewer 화면에 source URL, ONVIF endpoint, credential reference, raw JSON,
  debug counter를 노출
- OpenAPI 기반 VMS/NVR archive/playback/search API

## Sample Data Policy

sample은 `sample_h264.mp4`, `demo-client`, `fixture` 같은 합성 값만 사용합니다.
고객/운영 영상 URL, 개인 LAN IP, credential 원문, token/hash, ONVIF endpoint,
실제 RTSP/RTSPS URL은 artifact에 포함하지 않습니다.

Runtime metadata의 `source` object는 현재 operator/lab side-channel serializer가
내보내는 기존 field를 문서화한 것입니다. client/viewer wrapper contract에는 source
locator와 raw diagnostic JSON을 포함하지 않습니다.

## Verification

artifact 자체 검증:

```bash
./server.sh verify-integrator-contract-artifact
```

이 명령은 다음을 확인합니다.

- manifest, schema, sample 파일 존재와 JSON parse
- 각 sample의 `schema` 값과 manifest의 contract identifier 일치
- sample이 함께 제공되는 JSON Schema의 필수 field와 type을 만족
- artifact가 live contract 문서와 server entrypoint에 연결됨
- sample에 URL userinfo, LAN IP, password/token hash, RTSP/RTSPS URL 같은 금지
  노출 후보가 없음

Runtime delivery smoke는 별도입니다. 위 artifact 검증만 실행했다면 Event POST,
WebRTC, SSE, WebSocket delivery가 실제로 재검증됐다고 보고하지 않습니다.
