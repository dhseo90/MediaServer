# Live Event and Metadata Contracts

이 문서는 v1.1.0의 live event delivery contract를 분리해 정리합니다.
기존 Event POST payload, WebRTC DataChannel schema, SSE/WS runtime metadata
schema를 변경하지 않고, 각 소비 경로의 역할과 검증 기준을 한곳에 모읍니다.

관련 기준:

- [v1.1.0 Roadmap](./v1.1.0-roadmap.md)
- [Video Analysis / VA Guide](./video-analysis.md)
- [Stream Verification](./stream-verification.md)

## Document Ownership

이 문서는 Event POST, WebRTC DataChannel, SSE, WebSocket의 live delivery
contract 기준 문서입니다. 다른 문서에 같은 schema 예시가 있어도 contract 변경
판단은 이 문서의 boundary와 verification matrix를 먼저 봅니다.

| 문서 | 역할 |
| --- | --- |
| `docs/live-event-metadata-contracts.md` | live event delivery contract, schema 식별자, 변경 금지 기준 |
| `docs/video-analysis.md` | VA pipeline, event/scenario 상세, runtime metadata payload 예시 |
| `docs/stream-verification.md` | 실제 smoke 명령, 보정 서버, 실패/skip 해석 기준 |
| `docs/media-server-architecture.md` | pipeline 배치와 component boundary |
| `docs/config-reference.md` | env/query/config default와 운영 튜닝 값 |

문서가 충돌하면 live-only 제품 경계는 `docs/v1.1.0-roadmap.md`, contract 식별자는
이 문서를 기준으로 정리합니다. 구현 완료 여부는 검증 명령을 실행한 결과로만
보고합니다.

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

### Canonical Contract Identifiers

아래 식별자는 v1.1.0 live event delivery contract의 기준선입니다.
이 단계는 contract를 문서화하고 검증 기준을 고정하는 작업이며, schema field를
추가하거나 machine-readable enum을 바꾸는 작업이 아닙니다.

| 경로 | 기준 schema/label | 소비자 | 변경 정책 |
| --- | --- | --- | --- |
| Event POST | `media-server.va.event.v1` | 외부 HTTP endpoint | field/type 호환 유지 |
| WebRTC DataChannel | `media-server.webrtc.va-metadata.v1`, label `va-metadata` | WebRTC browser viewer | dashboard 내부 필드 추가 금지 |
| SSE runtime metadata | `media-server.va.runtime-metadata.v1` | custom RTSP client, custom dashboard | query filter/include로 범위만 축소 |
| WebSocket runtime metadata | `media-server.va.runtime-metadata.v1` | custom client | SSE와 같은 payload 유지 |
| WebSocket control ack | `media-server.va.metadata-control.v1` | custom client | subscription 상태 확인 전용 |

Contract 기준선에서 허용되는 변경은 문서, 검증 명령, 운영 지표 해석을 명확히
하는 범위입니다. payload field 추가/삭제, event type 이름 변경, source locator
노출, credential reference 노출은 별도 schema review 없이는 진행하지 않습니다.

### Implementation Map

계약 문서는 아래 구현 지점과 함께 검토합니다. 이 표는 파일 소유권을 바꾸지
않고, live event delivery contract와 실제 코드의 대응만 고정합니다.

| 계약 영역 | 주요 구현 파일 | 검토 포인트 |
| --- | --- | --- |
| Event POST payload/queue/status | `src/analysis/event_post_dispatcher.cpp`, `include/analysis/event_post_dispatcher.h` | `media-server.va.event.v1`, bounded queue, failure/drop/suppression counter |
| Event POST 호출 지점 | `src/ingress/webrtc_http_server.cpp`, `src/ingress/gstreamer_rtsp_server.cpp` | dispatch 실패가 RTSP/WebRTC media path로 전파되지 않는지 |
| Runtime metadata frame | `include/analysis/va_runtime_metadata.h`, `src/analysis/va_runtime_metadata.cpp` | `media-server.va.runtime-metadata.v1` 내부 frame과 WebRTC projection 분리 |
| Metadata filter | `include/analysis/metadata_subscription_filter.h`, `src/analysis/metadata_subscription_filter.cpp` | schema 변경 없이 `tracks[]`/`events[]` 범위만 축소 |
| WebRTC DataChannel | `src/ingress/webrtc_egress_session.cpp`, `include/ingress/webrtc_egress_session.h` | `va-metadata` label, backpressure/drop/failure가 media failure로 번지지 않는지 |
| SSE/WS side-channel | `src/ingress/webrtc_http_server.cpp` | SSE payload, WS text frame, `media-server.va.metadata-control.v1` ack |
| Operator/client 표시 | `src/ingress/product_ui_page_scripts.cpp`, `src/ingress/product_ui_css.cpp` | viewer에 source/debug/raw contract 정보가 노출되지 않는지 |
| 검증 자동화 | `scripts/internal/verify_event_post_dispatch.sh`, `scripts/internal/verify_webrtc_va_metadata.mjs`, `scripts/internal/va_metadata_stream_smoke.py`, `scripts/internal/verify_ws_va_metadata.mjs` | schema, delivery, filter/include, cleanup smoke |

구현 검토 중 위 파일에서 payload field를 바꾸는 변경이 필요해 보이면, 해당 변경은
이 문서 단계에서 처리하지 않고 별도 schema review 이슈로 분리합니다.

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

## Acceptance Criteria

이 contract 정리 단계는 아래 조건을 만족하면 완료로 봅니다.

- 기준 schema/label이 이 문서에 명시되어 있고 구현 파일과 검증 스크립트 위치가
  함께 연결되어 있음
- Event POST, WebRTC DataChannel, SSE, WebSocket의 역할과 소비자가 분리되어 있음
- EventRecord/snapshot/clip은 short event evidence 보조 기능으로만 설명되고,
  주요 integration contract로 승격되지 않음
- filter/include/limit는 payload schema 변경이 아니라 전송 범위 축소로 설명됨
- source locator, ONVIF endpoint, credential reference, raw debug JSON은
  client/viewer contract에 포함하지 않는다고 명시됨
- Event POST disabled, EventStorage disabled, listener 없음, 보정 포트 같은
  환경/skip 조건이 smoke matrix에서 제품 회귀와 분리되어 있음
- 문서 변경 검증과 v1.1.0 live-only boundary keyword 검증을 실행하고 결과를
  통과/미실행/skip으로 구분해 보고함

위 조건은 문서 contract 정리의 완료 기준입니다. 실제 Event POST/WebRTC/SSE/WS
runtime smoke를 실행하지 않았다면 live delivery 자체를 재검증했다고 쓰지 않습니다.

## Verification Matrix

아래 matrix는 변경 범위별 최소 smoke입니다. 명령을 실행하지 않은 경우에는
통과로 보고하지 않고 `미실행`으로 남깁니다.

| 변경 범위 | 최소 검증 | 통과 기준 | 실패/skip 해석 |
| --- | --- | --- | --- |
| 문서만 변경 | `git diff --check -- README.md README.en.md docs`, `./server.sh verify-docs-links` | trailing whitespace 없음, local link 실패 없음 | 명령 없음/실행 불가는 중단 후 보고 |
| v1.1.0 live-only 문구 | `./server.sh verify-v1.1-boundary-keywords` | failure 후보 없음 | review 후보는 사람이 문맥 확인 후 기록 |
| Event POST contract | `./server.sh verify-event-post --mode schema` | `media-server.va.event.v1` payload와 `payloadFormat` 유지 | 기본 서버 disabled 실패는 보정 서버로 재확인 |
| Event POST recovery | `./server.sh verify-event-post --mode recovery` | dispatcher recovery와 storage recovery 결과가 분리 보고됨 | EventStorage disabled skip은 skip으로 기록 |
| WebRTC DataChannel | `./server.sh verify-webrtc-va-metadata` | video track, ICE connected, `va-metadata` open, metadata 수신 | DataChannel failure가 media failure로 번지면 실패 |
| SSE side-channel | `./server.sh verify-va-metadata-sidechannel` | `media-server.va.runtime-metadata.v1`, filter/include, cleanup 확인 | listener 없음은 환경 실패로 기록하고 보정 포트 확인 |
| WebSocket side-channel | `./server.sh verify-ws-metadata` | runtime metadata frame과 control ack 수신 | auth on 미인증 401/viewer 403 기대값 유지 |
| Runtime dashboard/metadata fanout | `./server.sh verify-va-runtime-console`, `./server.sh verify-va-metadata-sidechannel`, `./server.sh verify-ws-metadata` | dashboard polling과 side-channel fanout이 같은 schema 기준 유지 | cleanup 잔여, stale/drop/fail 증가를 별도 warning으로 기록 |

장시간 검증은 이 contract 정리 단계의 기본 조건이 아닙니다.
`verify-predev --soak-minutes ...`, `verify-va-runtime-console-longrun ...`,
`verify-event-post-longrun ...`은 사용자가 명시하거나 RC gate에서 요구할 때만 실행합니다.
