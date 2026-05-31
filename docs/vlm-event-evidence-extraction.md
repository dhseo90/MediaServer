# VLM Event Evidence Extraction

이 문서는 `v2.0.0 V200-S07 이벤트 evidence 추출`의 source-of-truth입니다.
S07는 YOLO/Rule/Scenario 이벤트가 이미 발생한 뒤, VLM 입력 후보로 쓸 수 있는
짧은 evidence reference를 EventRecord 내부 metadata에 분리합니다.

## 직접 답

S07 evidence reference schema는 `media-server.vlm-event-evidence-refs.v1`입니다.
이 schema는 EventRecord top-level field가 아니라 `metadata.vlmEvidenceRefs`에만
들어갑니다. 실제 media bytes, source URL, credential, prompt, raw VLM response는
저장하지 않습니다.

추출하는 reference:

- `eventFrame`: 기존 snapshot hook이 만든 event-time snapshot media path
- `bboxCrop`: event bbox 기준 crop media path와 normalized bbox
- `temporalContext`: 기존 clip frame bundle manifest path
- `previousFrame`, `eventFrame`, `nextFrame`: clip manifest의 `vlmInputRefs` 안에서
  frame path reference로 분리

## Command

```bash
./server.sh verify-vlm-event-evidence-extraction
./server.sh verify-analysis-state
```

S07 회귀 확인:

```bash
./server.sh verify-va-events
./server.sh verify-va-replay
```

## Contract

- EventRecord storage schema의 top-level field는 `snapshotPath`, `clipPath`,
  `metadata` 경계를 유지합니다.
- bbox crop path는 EventRecord top-level field로 추가하지 않고
  `metadata.vlmEvidenceRefs.bboxCrop.path`에만 둡니다.
- clip manifest는 `media-server.va.event-clip-hook.v1` 안에 `vlmInputRefs`를 추가해
  `previousFrame`, `eventFrame`, `nextFrame` path reference를 제공합니다.
- crop manifest는 `media-server.va.event-bbox-crop-hook.v1`로 저장하며
  `rawFrameBytesEmbedded=false`, `sourceUrlExposed=false`,
  `credentialMaterialExposed=false`를 기록합니다.

## Non-Scope

S07에서 하지 않는 일:

- 실제 VLM runtime 호출
- cloud provider API 호출
- model artifact download 또는 bundle 포함
- VLMObservation sidecar 저장
- Event POST/WebRTC DataChannel/SSE/WS metadata schema 변경
- RTSP/WebRTC media path 변경
- viewer/client 화면 노출
- 운영 이벤트 설명/오탐 힌트 생성

## 완료 기준

- `./server.sh verify-vlm-event-evidence-extraction`이 EventRecord code, smoke, docs,
  inventory, non-scope boundary를 검증합니다.
- `./server.sh verify-analysis-state`가 snapshot media, bbox crop media, clip manifest
  `vlmInputRefs`, `metadata.vlmEvidenceRefs`, redaction boundary를 실행 smoke로 확인합니다.
- `./server.sh verify-va-events`와 `./server.sh verify-va-replay`가 기존 VA event
  발생/재생 경로가 유지되는지 확인합니다.
- `git diff --check`가 코드/문서/script whitespace drift를 확인합니다.

이 검증은 VLMObservation sidecar 저장, 운영 설명 생성, UI 리뷰 화면 구현, 장시간
안정화, UI 풀테스트 완료를 대신하지 않습니다.
