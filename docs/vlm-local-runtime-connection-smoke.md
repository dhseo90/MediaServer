# VLM Local Runtime Connection Smoke

이 문서는 `v2.1.0 V210-S02 Local VLM runtime connection smoke`의
source-of-truth입니다. S02는 S01의 default-off 계약을 유지하면서, 실제 외부 모델
품질 평가가 아니라 격리 loopback local runtime fixture에 HTTP roundtrip을 보내는
짧은 연결 smoke입니다.

## 직접 답

S02에서 쓰기로 한 1차 smoke는 `verify-vlm-local-runtime-smoke`입니다. 이 명령은
`media-server.vlm-local-runtime-smoke-fixtures.v1` fixture를 사용해 Ollama,
vLLM/OpenAI-compatible local endpoint, missing-runtime, timeout/queue cleanup,
invalid output fallback을 확인하고
`media-server.vlm-local-runtime-smoke-report.v1` report를 만들 수 있습니다.

이 smoke는 local loopback fixture server를 실제로 bind하고 HTTP request를 보냅니다.
따라서 정적 catalog만 확인하는 것이 아니라 local runtime 연결 경로의 request,
response parsing, timeout abort, queue cleanup을 실행합니다. 단, 사용자가 설치한
실제 Ollama/vLLM model 품질, model download, cloud provider API 호출 성공을 뜻하지
않습니다.

Fallback과 제외 대상:

- fallback: local runtime이 없으면 `blocked-missing-runtime`으로 기록하고 media path
  실패로 전파하지 않습니다.
- fallback: structured output이 invalid이면
  `rejected-invalid-output-no-sidecar-write`로 기록하고 sidecar/EventRecord를 쓰지
  않습니다.
- fallback: timeout이면 `timeout-cleanup-ok`를 요구하고 queue item이 cleanup된 뒤
  media path 실패로 전파하지 않습니다.
- 제외: 실제 cloud provider API 호출, provider credential 저장, model/runtime
  download 또는 bundle, VLMObservation sidecar write, Event POST/WebRTC/SSE/WS
  schema 변경, RTSP/WebRTC media path 변경, viewer/client 노출.

## v2.3.0 VLM opt-in operational evidence

`media-server.v230-vlm-opt-in-operational-evidence.v1` gate는 이 loopback local runtime
smoke를 v2.3.0 S05의 `local/provider smoke intake` 중 local intake로 사용합니다.
S05의 직접 답은 VLM default-on이 아니라 `operator-approved profile promotion`,
`local/provider smoke intake`, `privacy/default-off evidence`를 하나의 안정화 증적
묶음으로 기록하는 것입니다.

S05에서 `verify-v230-vlm-opt-in-operational-evidence`는 local smoke report가 실제
loopback HTTP roundtrip, missing-runtime fallback, timeout cleanup, invalid-output
fallback을 기록하는지 확인합니다. 이 PASS는 `no VLM default-on` 및 local fixture
연결 증적이며, 실제 사용자 모델 품질, cloud provider success, provider credential
저장, model/runtime bundle, sidecar write, UI 풀테스트, 30분/120분 longrun 실행을
뜻하지 않습니다. Sidecar is not mixed into EventRecord/API schema, and Event
POST/WebRTC DataChannel/SSE/WS metadata와 RTSP/WebRTC media path도 변경하지 않습니다.

S05 evidence keywords: operator-approved profile promotion; local/provider smoke intake; privacy/default-off evidence; no VLM default-on. Sidecar is not mixed into EventRecord/API schema.

## Fixture Matrix

| Case | 목적 | 기대 outcome |
| --- | --- | --- |
| `ollama-loopback-chat-pass` | Ollama `/api/chat` 형태의 local endpoint roundtrip | `connected-structured-output-accepted` |
| `vllm-openai-compatible-pass` | vLLM/OpenAI-compatible `/v1/chat/completions` roundtrip | `connected-structured-output-accepted` |
| `api-compatible-local-pass` | API-compatible local endpoint response shape 확인 | `connected-structured-output-accepted` |
| `missing-runtime-fallback` | local runtime 부재를 VLM-only blocked state로 분리 | `blocked-missing-runtime` |
| `timeout-queue-cleanup` | timeout abort 후 queue cleanup과 fixture server close 확인 | `timeout-cleanup-ok` |
| `invalid-output-fallback` | invalid structured output을 저장하지 않고 fallback 처리 | `rejected-invalid-output-no-sidecar-write` |

## Command

```bash
./server.sh verify-vlm-local-runtime-smoke \
  --report /tmp/media_server_vlm_local_runtime_smoke.md \
  --json-report /tmp/media_server_vlm_local_runtime_smoke.json
```

S02 안정화 묶음은 아래처럼 분리합니다.

```bash
./server.sh verify-vlm-test-rehearsal
./server.sh verify-vlm-local-runtime-smoke
git diff --check
```

## Non-Scope

S02에서 하지 않는 일:

- cloud provider API 호출 또는 cloud field smoke PASS 생성
- provider credential 저장
- 실제 model/runtime download, install, bundle, release asset 생성
- VLMObservation sidecar 저장
- Event POST/WebRTC DataChannel/SSE/WS metadata schema 변경
- RTSP/WebRTC media path 변경
- Ops UI 또는 client/viewer UI 변경
- 30분/120분 장시간 안정화 실행
- UI 풀테스트 PASS 생성

local runtime smoke PASS는 cloud provider field smoke PASS를 대체하지 않습니다. 실제
사용자 설치 local model의 품질과 latency도 이 smoke의 완료 evidence가 아닙니다.
