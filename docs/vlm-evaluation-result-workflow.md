# VLM Evaluation Result Workflow

이 문서는 `v2.1.0 V210-S06 VLM evaluation result workflow`의 세부 기준 문서입니다.
S06은 기존 `media-server.vlm-evaluation-report.v1` fixture 평가 결과를 `/ops/vlm`
운영 화면에서 비교하고, 운영자가 model/prompt profile 후보를 profile draft에 반영할
수 있게 합니다.

## 직접 답

S06에서 1차 선택 가능한 profile 후보는 `eval-qwen8b-event-review-default`입니다.
모델은 `Qwen/Qwen3-VL-8B-Instruct`, prompt profile은 `event-review-default`입니다.
fallback 후보는 `eval-qwen4b-false-positive-review`이며, 영어 품질이 아직
review-required라 active default가 아닙니다. `eval-qwen4b-operator-question-review`는
invalid JSON, latency 초과, hallucination fixture 실패 때문에 제외합니다.

`/ops/vlm`에는 `data-testid="ops-vlm-evaluation-result-workflow"` 패널이 있습니다.
이 패널은 `/ops/api/vlm/evaluation-results`의
`media-server.ops.vlm-evaluation-result-workflow.v1` payload를 읽어 latency, JSON
안정성, 설명 품질, hallucination risk, 한국어/영어 출력 품질을 표시합니다.
`profile draft 반영` 버튼은 선택한 평가 후보의 model, prompt profile, evaluation
status를 기존 VLM profile 저장 폼에 채웁니다. 저장은 운영자가 별도로 눌러야 하며,
선택만으로 profile 저장, activation, runtime call, provider call은 발생하지 않습니다.

## 선택 결과

| 후보 | 모델 | prompt profile | 평가 | 결정 |
| --- | --- | --- | --- | --- |
| `eval-qwen8b-event-review-default` | `Qwen/Qwen3-VL-8B-Instruct` | `event-review-default` | `passed` | 1차 선택값 |
| `eval-qwen4b-false-positive-review` | `Qwen/Qwen3-VL-4B-Instruct` | `false-positive-review` | `review-required` | fallback, active 불가 |
| `eval-qwen4b-operator-question-review` | `Qwen/Qwen3-VL-4B-Instruct` | `operator-question-review` | `failed` | 제외 |

## 검증

```bash
./server.sh verify-vlm-evaluation-result-workflow
./server.sh verify-vlm-evaluation-harness
./server.sh verify-vlm-recommendation-engine
./server.sh verify-vlm-profile-storage
git diff --check
```

## 비범위

- 실제 VLM runtime 호출
- cloud provider API 호출
- model/runtime install 또는 model artifact download
- profile 자동 저장 또는 자동 활성화
- VLMObservation sidecar write
- Event POST/WebRTC/SSE/WS metadata schema 변경
- RTSP/WebRTC media path 변경
- client/viewer 화면 노출

이 검증은 실제 model benchmark, 장시간 안정화, UI 풀테스트 완료를 대신하지 않습니다.
