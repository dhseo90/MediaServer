# VLM Recommendation Engine

이 문서는 `v2.0.0 V200-S03 VLM 추천 엔진`의 세부 기준 문서입니다.
추천 엔진은 `media-server.vlm-pc-capability.v1` PC 사양 감지 결과와
`media-server.vlm-selection-decision.v1` 모델 선택 결정을 입력으로 받아
privacy mode별 추천 모델, 대안 모델, 비추천 사유, 예상 memory/disk/latency/cost를
산출합니다.

## 직접 답

현재 V200-S03 추천 결정은 다음과 같습니다.

| PC class | privacy mode | 1차 추천 | 대안 | 비추천/조건부 사유 |
| --- | --- | --- | --- | --- |
| `local-unsupported` | `local-only` 또는 `cloud-disabled` | `no-local-vlm-recommendation` | 없음 | Qwen local 모델은 RAM/VRAM/headroom 미달, `gemini-2.5-flash`는 cloud opt-in 없음 |
| `local-unsupported` | `cloud-allowed` | `gemini-2.5-flash` | 없음 | Qwen local 모델은 RAM/VRAM/headroom 미달 |
| `local-low` | `local-only` 또는 `cloud-disabled` | `Qwen/Qwen3-VL-4B-Instruct` | 없음 | 8B/30B는 tier 상향, Gemini는 cloud opt-in 없음 |
| `local-low` | `cloud-allowed` | `Qwen/Qwen3-VL-4B-Instruct` | `gemini-2.5-flash` | 8B/30B는 tier 상향 |
| `local-standard` | `local-only` 또는 `cloud-disabled` | `Qwen/Qwen3-VL-8B-Instruct` | `Qwen/Qwen3-VL-4B-Instruct` | 30B는 high tier 전용, Gemini는 cloud opt-in 없음 |
| `local-standard` | `cloud-allowed` | `Qwen/Qwen3-VL-8B-Instruct` | `Qwen/Qwen3-VL-4B-Instruct`, `gemini-2.5-flash` | 30B는 high tier 전용 |
| `local-high` | `local-only` 또는 `cloud-disabled` | `Qwen/Qwen3-VL-30B-A3B-Instruct` 평가 후보 | `Qwen/Qwen3-VL-8B-Instruct` safe fallback | 30B는 V200-S06 평가 전 default-on 아님, Gemini는 cloud opt-in 없음 |
| `local-high` | `cloud-allowed` | `Qwen/Qwen3-VL-30B-A3B-Instruct` 평가 후보 | `Qwen/Qwen3-VL-8B-Instruct`, `gemini-2.5-flash` | 30B는 V200-S06 평가 전 default-on 아님 |

Gemma 계열은 사용자 준비 후보로만 남깁니다. 별도 terms/license review가 필요하므로
기본값, fallback, recommendation baseline으로 추천하지 않습니다.

## Command

```bash
./server.sh recommend-vlm-model \
  --pc-capability <capability.json> \
  --privacy-mode local-only
```

fixture 기반 확인:

```bash
./server.sh recommend-vlm-model \
  --pc-capability-fixture test/fixtures/vlm_pc_capability/cases.json \
  --fixture-case linux-nvidia-12gb \
  --privacy-mode cloud-allowed
```

추천 엔진 검증:

```bash
./server.sh verify-vlm-recommendation-engine
```

## Output Contract

출력 schema는 `media-server.vlm-recommendation.v1`입니다.

필수 산출:

- `pcCapability`: detector의 OS/RAM/GPU/hardware class 요약
- `privacy`: `local-only`, `cloud-disabled`, `cloud-allowed`와 외부 전송 허용 여부
- `decision.primaryRecommendation`: 1차 추천 또는 `null`
- `decision.alternativeRecommendations`: 대안 모델 목록
- `decision.notRecommended`: 비추천 또는 조건부 후보와 이유
- `resourceEstimate`: 각 모델별 예상 memory, disk, latency, cost class
- `runtimeReadiness`: local runtime 준비 상태. 이 값은 설치 실행이 아니라 경고입니다.
- `contractInvariants`: Event POST, WebRTC DataChannel, SSE/WS metadata, media path 비변경 확인값

예상 resource 값은 planning estimate입니다. 실제 latency, memory, structured output
품질, hallucination, 한국어/영어 설명 품질은 `V200-S06 VLM 평가 harness`에서
별도로 측정해야 합니다.

## Estimates

| 모델 | memory estimate | disk estimate | latency estimate | cost estimate |
| --- | --- | --- | --- | --- |
| `Qwen/Qwen3-VL-4B-Instruct` | local working set 10GB 계획값 | model artifact 9GB 계획값 | P50 6초/P95 20초 계획값 | provider API 비용 없음, local hardware 비용 |
| `Qwen/Qwen3-VL-8B-Instruct` | local working set 18GB 계획값 | model artifact 16GB 계획값 | P50 8초/P95 25초 계획값 | provider API 비용 없음, local hardware 비용 |
| `Qwen/Qwen3-VL-30B-A3B-Instruct` | local working set 46GB 계획값 | model artifact 60GB 계획값 | P50 12초/P95 35초 계획값 | provider API 비용 없음, high local hardware/evaluation 비용 |
| `gemini-2.5-flash` | local model memory 0GB | local model artifact 0GB | provider/API/network dependent | provider API variable cost, current pricing review 필요 |

모델 artifact와 runtime package는 repo, source release, binary bundle, container image에
포함하지 않습니다.

## Privacy And Operation Gates

- `cloud-allowed`가 아니면 `gemini-2.5-flash`를 추천하지 않습니다.
- cloud 추천은 외부 전송, provider terms, logging/retention, 현재 pricing 검토가
  끝났다는 뜻이 아닙니다.
- local 추천은 runtime과 model 설치가 끝났다는 뜻이 아닙니다.
- local runtime이 없으면 추천은 유지하되 `runtimeReadiness.status`와 warning으로
  설치/연결이 별도 단계임을 표시합니다.
- 추천 결과는 viewer/client 화면에 노출하지 않습니다.
- source URL, credential, prompt, raw response를 출력하지 않습니다.

## 완료/비범위

V200-S03 완료 조건:

- `./server.sh recommend-vlm-model`이 PC capability와 privacy mode를 받아
  추천/대안/비추천/resource estimate JSON을 산출합니다.
- `test/fixtures/vlm_recommendation/cases.json`이 low/standard/high/unsupported PC class,
  local-only, cloud-disabled, cloud-allowed, missing runtime tool case를 보존합니다.
- `./server.sh verify-vlm-recommendation-engine`이 recommendation matrix와 문서/명령
  연결, 비범위 경계를 검증합니다.
- `git diff --check`가 문서/fixture/script whitespace drift를 확인합니다.

이번 단계에서 하지 않는 일:

- 설치/연결 UI 구현
- profile 저장
- VLM runtime 호출
- VLMObservation sidecar 저장
- Event POST/WebRTC/SSE/WS metadata schema 변경
- RTSP/WebRTC media path 변경
- client/viewer 제품 화면 노출
- model/runtime bundle release
- V200-S06 평가 harness 실행 또는 benchmark PASS 보고
