# VLM 입력용 이벤트 evidence 참조

개발자가 이미 발생한 YOLO/Rule/Scenario 이벤트의 짧은 evidence를 VLM 입력 후보와
연결하는 저장 계약이다. 기준은 [event_storage.cpp](../src/analysis/event_storage.cpp)의
`BuildVlmEvidenceRefsJson`, `AttachVlmEvidenceRefs`, `WriteBboxCropMedia`와 clip manifest 생성이다.
참조를 만드는 것과 실제 VLM 호출·설명 생성은 별개다.

## 참조 구조

schema는 `media-server.vlm-event-evidence-refs.v1`,
`inputMode=event-short-evidence-ref-only`다.
EventRecord의 `metadata.vlmEvidenceRefs`에 넣으며 최상위 필드를 늘리지 않는다.

| 참조 | 현재 의미 |
| --- | --- |
| `eventFrame` | 기존 snapshot의 `path`와 `available` |
| `bboxCrop` | crop의 `path/available`과 정규화 좌표 `bbox`; 최상위 `bboxCropPath`를 추가하지 않음 |
| `temporalContext` | clip manifest `path`, `frameBundleManifest`, `previousFrameRef/eventFrameRef/nextFrameRef` |
| `evidenceManifest` | frame-bundle 형식 clip의 `evidence-manifest.json` 참조와 `media-server.event-evidence-contract.v1` |

`available`은 경로 값과 clip 경로 모양에서 계산한다. 파일 존재·디코딩 가능성·VLM 입력 품질을
다시 검사한 결과가 아니다. 참조 소비자는 실제 evidence 상태를 별도로 확인해야 한다.
`rawMediaEmbedded=false`, `sourceUrlExposed=false`, `credentialMaterialExposed=false`를 유지한다.

기존 clip hook의 `media-server.va.event-clip-hook.v1` manifest는
`vlmInputRefs.previousFrame/eventFrame/nextFrame`에 frame 경로를 제공한다.
bbox crop manifest는 `media-server.va.event-bbox-crop-hook.v1`이며
`rawFrameBytesEmbedded=false/sourceUrlExposed=false/credentialMaterialExposed=false`를 기록한다.
참조 JSON에 바이트를 넣지 않는다는 뜻이지 snapshot/crop/clip 미디어 파일을 쓰지 않는다는 뜻은 아니다.
유효한 frame 입력과 활성화된 hook이 있으면 별도 미디어 파일과 manifest를 만든다.

## 소비 경계

EventRecord 최상위 `snapshotPath/clipPath/metadata` 계약은 유지한다.
내부 경로와 evidence metadata를 viewer/client에 그대로 노출하지 않는다.
[평가 fixture](vlm-evaluation-harness.md)의 `fixture://` 문자열과 실제 파일 참조는 구분하며,
[observation 저장](vlm-observation-sidecar.md)과 [Ops 검토](vlm-ops-event-review-ui.md)는 별도 단계다.

이 참조 생성은 모델 다운로드·VLM runtime/provider 호출·observation 쓰기·운영 설명 생성이나
Event POST/WebRTC DataChannel/SSE/WS schema·RTSP/WebRTC 경로 변경을 수행하지 않는다.

## 검사와 실행

```bash
./server.sh verify-vlm-event-evidence-extraction
./server.sh verify-analysis-state
./server.sh verify-va-events
./server.sh verify-va-replay
```

첫 명령은 C++ 참조 생성과 smoke source의 경계·연결을 읽는 정적 검사이며 EVT-027·EVT-029와
연결된다. 실제 snapshot/crop/clip manifest·참조 저장 smoke는 별도 `verify-analysis-state`가
빌드·실행한다. 나머지는 기존 VA 이벤트 발생·재생 회귀다.
[검증 정책](stream-verification.md#검증-정책)에 따라 승인 범위와 산출물·정리를 먼저 확인하고,
이 결과를 실제 모델 품질·[UI 풀테스트](manual-ui-fulltest.md)·장시간 성공으로 확대하지 않는다.
