# v3.1 Encoded Event Clip Contract

이 문서는 v3.1.0 `V310-S01 Encoded Event Clip Contract`의 source-of-truth입니다.
독자는 운영 기능 개발자와 테스트 에이전트이며, lifecycle은 v3.1.0 Encoded Event
Clip and Safe Sharing Expansion 구현 기간 동안 유지되는 계약 문서입니다. AGENTS.md가
완료/검증/커밋 권한의 최상위 규칙이고, 이 문서는 encoded event clip manifest와
FrameRef/PTS mapping 계약만 정의합니다.

## Scope

이 계약은 live VA/Rule/Scenario 이벤트에서 생성될 수 있는 짧은 encoded event clip의
정적 manifest 형식을 정의합니다. 구현 완료 범위는 MP4/WebM clip manifest,
FrameRef/PTS mapping, event evidence/frame bundle 연결, retention lifecycle,
privacy/non-VMS boundary, fixture, verifier 연결입니다.

이 단계에서 하지 않는 일:

- encoded clip generation queue
- frame bundle 또는 bounded segment를 실제 MP4/WebM으로 muxing
- `/ops/events` replay timeline UI
- client/viewer event digest 노출
- scoped integrator search API
- operator correction, vector search, export bundle hardening
- 24/7 상시녹화
- broad archive playback/search
- VMS/NVR archive API
- 얼굴 인식, 신원 식별, watchlist, face embedding
- raw LLM/VLM prompt 또는 raw provider response durable storage
- cloud provider default-on 호출

## EncodedClipManifest

EncodedClipManifest는 EventRecord, EvidenceManifest, frame bundle, encoded media file을
짧은 event-centered evidence로 연결하는 sidecar 형식입니다. 이 manifest는
Event POST/WebRTC DataChannel/SSE/WS metadata payload가 아니며 RTSP/WebRTC media path
계약도 변경하지 않습니다.

| 필드 | 필수 | 설명 |
| --- | --- | --- |
| `schema` | 예 | `media-server.encoded-event-clip-contract.v1` |
| `contractVersion` | 예 | breaking change 추적용 정수. v3.1 S01은 `1` |
| `eventId` | 예 | 원본 EventRecord id |
| `sourceId` | 예 | source registry id |
| `channelId` | 예 | source channel id. 단일 채널이면 `main` |
| `streamEpochId` | 예 | stream restart를 구분하는 epoch id |
| `createdAtMs` | 예 | manifest 생성 wall-clock time |
| `sampleKind` | 예 | fixture가 runtime output이 아님을 분리하는 값 |
| `clip` | 예 | encoded media artifact identity와 bounded window |
| `format` | 예 | container/codec/mime/extension 계약 |
| `ptsMapping` | 예 | FrameRef와 encoded clip PTS 사이의 mapping |
| `evidenceLinks` | 예 | EvidenceManifest/frame bundle/event frame 연결 |
| `retention` | 예 | event evidence lifecycle과 clip cleanup precondition |
| `privacy` | 예 | raw prompt/response와 identity feature non-retention guard |
| `nonVmsBoundary` | 예 | VMS/NVR scope drift를 막는 금지 항목 |
| `generationBoundary` | 예 | encoder pipeline이 이번 단계 범위가 아님을 명시 |

## Clip Format

지원 대상 contract는 MP4와 WebM입니다. v3.1 S01은 형식을 정의하지만 encoder를 실행하지
않습니다.

| 필드 | 설명 |
| --- | --- |
| `container` | `mp4` 또는 `webm` |
| `mimeType` | `video/mp4` 또는 `video/webm` |
| `videoCodec` | `h264`, `vp8`, `vp9` 등 구현 step에서 선택 가능한 codec id |
| `extension` | `.mp4` 또는 `.webm` |
| `durationMs` | event 중심 짧은 clip 길이 |
| `startRelativeToEventMs` | event trigger 기준 clip 시작 offset |
| `endRelativeToEventMs` | event trigger 기준 clip 종료 offset |

MP4/WebM은 event-centered evidence clip일 때만 contract 대상입니다. 임의 시간 범위
export, channel 전체 재생, continuous segment index, VMS/NVR archive API는 이 계약의
대상이 아닙니다.

## FrameRef To PTS Mapping

encoded clip은 v3.0 frame bundle의 FrameRef와 재생 시각을 함께 보존해야 합니다.
FrameRef 필드는 v3.0 Evidence Contract와 동일합니다.

| 필드 | 필수 | 설명 |
| --- | --- | --- |
| `sourceId` | 예 | source registry id |
| `channelId` | 예 | source channel id |
| `streamEpochId` | 예 | stream session/epoch id |
| `frameSeq` | 예 | stream epoch 내부 frame sequence |
| `ptsMs` | 예 | source media PTS milliseconds |
| `wallClockMs` | 예 | capture wall-clock milliseconds |
| `relativeToEventMs` | 예 | event trigger 기준 상대 시간 |

`ptsMapping.frames[]`는 각 FrameRef에 대해 아래 값을 둡니다.

| 필드 | 필수 | 설명 |
| --- | --- | --- |
| `phase` | 예 | `pre`, `event`, `post` |
| `frameRef` | 예 | 원본 source frame identity |
| `clipPtsMs` | 예 | encoded clip 안에서의 PTS milliseconds |
| `relativeToEventMs` | 예 | event trigger 기준 상대 시간 |
| `artifactRefs` | 아니오 | eventFrame, representativeImage, bboxCrop 같은 evidence artifact id |

event frame은 `relativeToEventMs: 0`과 `clipPtsMs`를 가져야 합니다. 재생 UI나 exporter는
이 mapping을 사용해 still evidence와 encoded clip time을 맞춥니다.

## Evidence Links

EncodedClipManifest는 기존 evidence를 대체하지 않습니다. `eventFrame`은 v3.0 계약처럼
필수 trigger-time evidence이고 encoded clip은 추가 evidence입니다.

| 연결 | 설명 |
| --- | --- |
| `evidenceManifestStorageKey` | v3.0 EvidenceManifest sidecar 위치 |
| `frameBundleManifestStorageKey` | pre/event/post frame bundle manifest 위치 |
| `eventFrameArtifactId` | trigger-time evidence image artifact id |
| `representativeImageArtifactId` | 선택된 대표 frame artifact id |
| `bboxCropArtifactIds` | bbox crop artifact id 목록 |

## Retention Lifecycle

encoded clip은 독립 archive가 아니라 EventRecord evidence lifecycle의 일부입니다.
기본 evidence/feature/clip retention은 7일입니다. pinned event는 automatic cleanup에서
제외합니다. destructive cleanup은 dry-run 없이 실행하지 않습니다.

cleanup은 아래 대상을 하나의 lifecycle로 취급해야 합니다.

- EventRecord
- EvidenceManifest
- frame bundle manifest
- encoded clip manifest와 media file
- feature revision
- search index entry
- audit trail entry

실제 cleanup 실행과 export hardening은 `V310-S08 Retention/Export Hardening` 범위입니다.
이 문서는 cleanup 대상과 precondition 계약만 정의합니다.

## Privacy And Non-VMS Boundary

raw LLM/VLM prompt와 raw provider response는 durable storage에 저장하지 않습니다.
encoded clip manifest에는 provider credential, source URL, raw request body, debug
counter, internal-only provenance 원문을 저장하지 않습니다.

identity feature는 금지입니다. person name, account identity, face recognition
match, face embedding/template/faceprint, watchlist match, long-term personal
re-identification, ID card, phone number, license plate identity search는
EncodedClipManifest 또는 clip metadata에 저장하지 않습니다.

이 계약은 24/7 recorder, continuous archive, VMS/NVR archive API, broad archive
playback/search를 제공하지 않습니다. encoded clip generation은 다음 `V310-S02 Event
Clip Encoder Pipeline` 범위이며, replay timeline UI는 `V310-S03 Replay Timeline UI`
범위입니다.

## Fixture And Verification

대표 fixture는
`test/fixtures/v310_event_clip_contract/encoded_clip_manifest_sample.json`입니다.
정적 verifier는 `./server.sh verify-v310-event-clip-contract`입니다.

이 verifier PASS는 EncodedClipManifest/FrameRef-PTS mapping/retention/non-VMS boundary
계약과 문서/fixture/inventory 연결 확인만 뜻합니다. encoder pipeline, runtime muxing,
queue/status/cleanup 실행, `/ops/events` replay timeline UI, client-safe digest,
scoped integrator API, UI 풀테스트, 30분/120분 longrun, published metadata, tag/push,
GitHub Release PASS를 대체하지 않습니다.
