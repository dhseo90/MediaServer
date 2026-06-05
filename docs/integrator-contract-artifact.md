# Integrator Contract Artifact

이 문서는 v1.8.0 `Integrator contract artifact` 범위에서 외부 연동자가 받을 수
있는 배포 산출물의 위치와 검증 기준을 고정합니다. 기준 payload는
[Live Event and Metadata Contracts](./live-event-metadata-contracts.md)를 따르며,
이 산출물은 기존 Event POST, WebRTC DataChannel, SSE, WebSocket payload field를
추가하거나 삭제하지 않습니다. 즉, payload field를 추가하거나 삭제하지 않습니다.

상태: `1차 구현`

## Artifact Layout

기본 sample bundle과 V230 companion files:

```text
test/fixtures/integrator_contract_artifact/
  README.md
  CHANGELOG.md
  field-index.json
  schema-review-checklist.md
  freeze-baseline.json
  checksums.json              # V230 companion, self-reference 때문에 manifest.files에는 넣지 않음
  v230-conformance.json       # V230 companion, checksum manifest가 별도로 고정
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
`field-index.json`은 top-level field와 integrator-visible payload에서 제외해야 할
field를 고정합니다. `schema-review-checklist.md`는 payload mutation 요청이
나왔을 때만 사용하는 review gate입니다.
`freeze-baseline.json`은 `media-server.v200-contract-schema-freeze.v1` schema의
v2.0.0 entry freeze gate입니다. artifact 파일, source contract 문서, 그리고
Auth/session/scope, SourceRegistry/PublishedView, Rule/Profile payload 기준 파일의
SHA-256을 고정하며, drift가 있으면 schema review 없이 v2.0.0 신규 기능으로
넘어가지 않습니다.

`checksums.json`은 `media-server.integrator-contract-checksums.v1` schema의
V230-S07 checksum companion입니다. `manifest.json`에 포함된 sample/schema/support
파일과 `v230-conformance.json`의 현재 SHA-256을 고정하되, 자기 자신은
self-reference를 피하기 위해 제외합니다. `v230-conformance.json`은
`media-server.integrator-contract-conformance.v1` schema로 V230-S07의
runtime delivery smoke, checksum, client redaction evidence 경계를 묶습니다.
이 파일은 payload field를 추가하거나 삭제하지 않습니다.

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
- v2.0.0 entry freeze gate용 `freeze-baseline.json`
- V230-S07 checksum companion `checksums.json`
- V230-S07 conformance companion `v230-conformance.json`
- Auth/session/scope, SourceRegistry/PublishedView, Rule/Profile payload 기준선의
  drift 감지 목록

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
- `field-index.json`, `CHANGELOG.md`, `schema-review-checklist.md`가 bundle에
  포함되고 manifest와 일치함
- `freeze-baseline.json`의 SHA-256 pin이 artifact와 source contract 문서의 현재
  내용과 일치하며, intentional drift는 schema review가 필요함
- `checksums.json`이 현재 bundle file과 `v230-conformance.json`의 SHA-256을
  일치하게 고정함
- `v230-conformance.json`이 runtime delivery smoke와 client redaction evidence를
  실제 실행 evidence 없이 PASS로 확대 보고하지 않도록 고정함

Runtime delivery smoke는 별도입니다. 위 artifact 검증만 실행했다면 Event POST,
WebRTC, SSE, WebSocket delivery가 실제로 재검증됐다고 보고하지 않습니다.
