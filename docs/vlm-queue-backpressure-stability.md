# VLM Queue/Backpressure Stability

이 문서는 `v2.1.0 V210-S04 VLM queue/backpressure stability`의 세부 기준 문서입니다.
S04는 VLM worker 상태가 RTSP/WebRTC media path, EventRecord, metadata fanout,
Event POST dispatch를 막지 않는지 fixture와 기존 stability verifier로 확인합니다.

## 직접 답

S04의 1차 gate는 `verify-vlm-queue-backpressure-stability`입니다. 이 명령은
`media-server.vlm-queue-backpressure-fixtures.v1` fixture로 default-off,
missing-model, invalid-output, timeout, metadata fanout, Event POST dispatch 상태를
VLM-only failure로 판정하고, media/event/metadata 경로로 backpressure가 전파되지
않는지 확인합니다.

```bash
./server.sh verify-vlm-queue-backpressure-stability \
  --report /tmp/media_server_vlm_queue_backpressure.md \
  --json-report /tmp/media_server_vlm_queue_backpressure.json
```

이 fixture는 실제 VLM runtime/provider 호출은 수행하지 않습니다. 모델 download,
provider credential 저장, sidecar write, Event POST/WebRTC/SSE/WS payload/schema 변경,
RTSP/WebRTC media path 변경도 수행하지 않습니다.

## 안정화 명령

S04 완료 evidence는 아래 short stability 묶음입니다.

```bash
./server.sh build
./server.sh verify-vlm-queue-backpressure-stability
./server.sh verify-va-events
./server.sh verify-event-post
./server.sh verify-webrtc-va-metadata
./server.sh verify-va-metadata-sidechannel
./server.sh verify-ws-metadata
git diff --check
```

각 verifier는 자기 범위만 PASS입니다. `verify-vlm-queue-backpressure-stability`는
VLM queue fixture와 side-effect boundary를 확인하고, `verify-va-events`와
`verify-event-post`는 기존 EventRecord/Event POST 경로를, metadata verifier는
WebRTC/SSE/WS metadata schema와 fanout smoke를 확인합니다.

## 30분/120분/UI 경계

- 30분 soak는 runtime path나 queue/backpressure 제품 경로 변경이 있을 때만 실행합니다.
  이번 fixture/static verifier만으로 30분 안정화 PASS를 만들지 않습니다.
- 120분 longrun은 active RSS high-water, retry queue drift, media/fanout high-risk signal,
  또는 release candidate gate에서 사용자 승인 후 실행합니다.
- 이 문서와 verifier는 브라우저 UI 직접 확인 evidence가 아닙니다. `/ops/vlm` runtime
  status UI는 V210-S05에서 별도 직접 확인합니다.

## Fixture 판정

| Case | 기대 outcome | 확인 경계 |
| --- | --- | --- |
| `default-off-no-worker` | `default-off-no-queue-start` | default-off가 VLM queue를 자동 시작하지 않음 |
| `missing-model-nonblocking` | `blocked-missing-model-nonblocking` | missing model이 media path FAIL로 번지지 않음 |
| `queue-timeout-drop-vlm-only` | `timeout-no-media-path-failure` | timeout은 VLM task drop으로 닫힘 |
| `invalid-output-rejected-no-sidecar` | `rejected-invalid-output-nonblocking` | invalid output이 sidecar/Event POST에 저장되지 않음 |
| `metadata-fanout-independent` | `metadata-fanout-independent` | WebRTC/SSE/WS metadata fanout 독립 유지 |
| `event-post-dispatch-independent` | `event-post-dispatch-independent` | EventRecord/Event POST dispatch 독립 유지 |

## 완료/비완료 구분

완료로 볼 수 있는 것은 S04 fixture, verifier, docs/inventory/server wiring, 그리고
실행한 short stability 명령의 PASS입니다. local runtime 품질, cloud provider field
smoke, 30분/120분 장시간 안정성, `/ops/vlm` UI 직접 조작은 이 문서의 완료 evidence가
아닙니다.
