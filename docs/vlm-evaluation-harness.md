# VLM Evaluation Harness

이 문서는 `v2.0.0 V200-S06 VLM 평가 harness`의 세부 기준 문서입니다.
S06는 실제 모델을 자동 설치하거나 provider API를 호출하지 않고,
`fixture-captured-output-only` 방식으로 latency, 설명 품질, hallucination, JSON 안정성,
한국어/영어 출력 품질을 비교하는 평가 harness를 고정합니다.

## 직접 답

현재 S06 평가 report schema는 `media-server.vlm-evaluation-report.v1`입니다.
입력 fixture는 `media-server.vlm-evaluation-fixtures.v1`이고, 각 case는 sample 이벤트의
`eventFrame`, `bboxCrop`, `previousFrame`, `nextFrame` reference와 prompt profile A/B
candidate output을 포함합니다.

평가하는 항목:

- latency: candidate `latencyMs`가 case threshold 안에 있는지 확인
- explanation quality: event type별 필수 용어 coverage
- hallucination: forbidden claim과 unsupported claim이 없는지 확인
- JSON 안정성: `media-server.vlm-event-review.v1` structured output parse와 필수 field
- 한국어/영어 품질: output language field와 실제 visible text language

## Command

```bash
./server.sh evaluate-vlm-harness \
  --fixture test/fixtures/vlm_evaluation_harness/cases.json \
  --json-output /tmp/media_server_vlm_eval_report.json \
  --report /tmp/media_server_vlm_eval_report.md
```

특정 case만 확인할 때:

```bash
./server.sh evaluate-vlm-harness --case line-crossing-ko-ab
```

검증:

```bash
./server.sh verify-vlm-evaluation-harness
```

## Fixture Contract

fixture case는 아래 evidence reference를 모두 가져야 합니다.

- `previousFrame`
- `eventFrame`
- `nextFrame`
- `bboxCrop`

reference는 현재 단계에서 실제 image bytes를 저장하지 않는 `fixture://` locator입니다.
실제 EventRecord snapshot/crop/clip 추출은 `V200-S07` 범위이고, S06는 평가 harness가
그 reference를 입력으로 받을 수 있는지와 captured output을 일관되게 채점하는지를
확인합니다.

## Non-Scope

S06에서 하지 않는 일:

- 실제 VLM runtime 호출
- cloud provider API 호출
- model artifact download 또는 bundle 포함
- VLMObservation sidecar 저장
- Event POST/WebRTC DataChannel/SSE/WS metadata schema 변경
- RTSP/WebRTC media path 변경
- viewer/client 화면 노출
- S07 evidence 추출 또는 S08 sidecar 저장 완료 주장

## 완료 기준

- `./server.sh evaluate-vlm-harness`가 `media-server.vlm-evaluation-report.v1` report를
  출력합니다.
- fixture가 line-crossing 한국어 A/B 비교, intrusion 영어 JSON 안정성 비교, invalid
  JSON/hallucination failure case를 포함합니다.
- `./server.sh verify-vlm-evaluation-harness`가 fixture, report scoring, docs/inventory,
  server command, non-scope boundary를 검증합니다.
- `git diff --check`가 문서/fixture/script whitespace drift를 확인합니다.

이 검증은 실제 모델 benchmark, 운영 default 승격, 장시간 안정화, UI 풀테스트 완료를
대신하지 않습니다.
