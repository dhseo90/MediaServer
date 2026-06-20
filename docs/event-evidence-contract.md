# Event Evidence Contract

이 문서는 v3.0.0 `V300-S01 Event Evidence Contract`의 source-of-truth입니다.
독자는 운영 기능 개발자와 테스트 에이전트이며, lifecycle은 v3.0.0 Event Evidence
Search MVP 구현 기간 동안 유지되는 계약 문서입니다. AGENTS.md가 완료/검증/커밋
권한의 최상위 규칙이고, 이 문서는 evidence manifest와 FrameRef 계약만 정의합니다.

## Scope

이 계약은 live VA/Rule/Scenario 이벤트에서 생성되는 evidence bundle의 정적 형식을
정의합니다. 구현 완료 범위는 EvidenceManifest, FrameRef, retention lifecycle,
privacy/non-VMS boundary, fixture, verifier 연결입니다.

이 단계에서 하지 않는 일:

- 24/7 상시녹화
- VMS/NVR archive API
- encoded MP4/WebM event clip
- clip playback 또는 replay timeline
- 얼굴 인식, 신원 식별, watchlist, face embedding
- raw LLM/VLM prompt 또는 raw provider response durable storage
- client/viewer 노출
- default-on cloud provider 호출

## EvidenceManifest

EvidenceManifest는 EventRecord와 저장된 evidence image 사이의 최소 연결 계약입니다.
이 manifest는 runtime/media schema를 바꾸는 payload가 아니라 v3.0 evidence storage의
durable sidecar 형식입니다.

| 필드 | 필수 | 설명 |
| --- | --- | --- |
| `schema` | 예 | `media-server.event-evidence-contract.v1` |
| `contractVersion` | 예 | breaking change 추적용 정수. v3.0 S01은 `1` |
| `eventId` | 예 | 원본 EventRecord id |
| `sourceId` | 예 | source registry id |
| `channelId` | 예 | source channel id. 단일 채널이면 `main` |
| `streamEpochId` | 예 | stream restart를 구분하는 epoch id |
| `createdAtMs` | 예 | manifest 생성 wall-clock time |
| `artifacts.eventFrame` | 예 | trigger-time evidence image |
| `artifacts.representativeImage` | 아니오 | 더 좋은 VLM input frame이 있을 때만 선택 저장 |
| `artifacts.bboxCrops` | 아니오 | object bbox crop evidence 목록 |
| `artifacts.frameBundle` | 아니오 | pre/event/post frame reference bundle |
| `retention` | 예 | retention window, pin, cleanup precondition |
| `privacy` | 예 | raw prompt/response와 identity feature non-retention guard |
| `nonVmsBoundary` | 예 | VMS/NVR scope drift를 막는 금지 항목 |

## FrameRef

모든 evidence image와 feature provenance는 FrameRef를 가진다. stream-local sequence가
재시작되어도 source/time identity를 유지하기 위해 아래 필드를 함께 저장합니다.

| 필드 | 필수 | 설명 |
| --- | --- | --- |
| `sourceId` | 예 | source registry id |
| `channelId` | 예 | source channel id |
| `streamEpochId` | 예 | stream session/epoch id |
| `frameSeq` | 예 | stream epoch 내부 frame sequence |
| `ptsMs` | 예 | media PTS milliseconds |
| `wallClockMs` | 예 | capture wall-clock milliseconds |
| `relativeToEventMs` | 예 | event trigger 기준 상대 시간. event frame은 `0` |

## Artifact Roles

`eventFrame`은 필수이며 trigger-time evidence를 나타냅니다. `representativeImage`는 optional입니다.
event frame보다 VLM 입력에 적합한 frame이 있을 때만 저장합니다.
선택 시 `selectionReason`과 원본 FrameRef를 함께 남깁니다.

`bboxCrop`은 optional입니다. crop은 parent artifact id와 bbox 좌표를 가져야 하며,
crop image 자체도 원본 frame의 FrameRef를 유지합니다.

`frameBundle`은 optional입니다. v3.0 S01은 bundle contract만 정의하며 실제 추출은
`V300-S02 Frame Bundle Extraction` 범위입니다. bundle에는 `pre`, `event`, `post`
phase와 각 phase별 FrameRef 목록을 둡니다.

## Retention Lifecycle

기본 evidence/feature retention은 7일입니다. pinned event는 automatic cleanup에서
제외합니다. destructive cleanup은 dry-run 없이 실행하지 않습니다.

cleanup은 아래 대상을 하나의 lifecycle로 취급해야 합니다.

- evidence image
- bbox crop
- frame bundle reference
- feature revision
- search index entry
- audit trail entry
- v3.1 이후 encoded clip이 생기면 해당 clip reference

## Privacy And Non-VMS Boundary

raw LLM/VLM prompt와 raw provider response는 durable storage에 저장하지 않습니다.
feature record에는 structured non-identifying values, confidence, uncertainty,
provenance summary, evidence reference만 저장합니다.

identity feature는 금지입니다. person name, account identity, face recognition
match, face embedding/template/faceprint, watchlist match, long-term personal
re-identification, ID card, phone number, license plate identity search는
EvidenceManifest 또는 v3.0 feature schema에 저장하지 않습니다.

이 계약은 24/7 recorder, VMS/NVR archive API, encoded clip playback을 제공하지
않습니다. encoded MP4/WebM event clip과 replay timeline은 v3.1 후보이며, v3.0
S01 완료 evidence가 아닙니다.

## Fixture And Verification

대표 fixture는
`test/fixtures/event_evidence_contract/evidence_manifest_sample.json`입니다.
정적 verifier는 `./server.sh verify-v300-event-evidence-contract`입니다.

이 verifier PASS는 EvidenceManifest/FrameRef/retention/non-VMS boundary 계약과
문서/fixture/inventory 연결 확인만 뜻합니다. frame 추출, bbox crop 생성, VLM feature
queue, search DSL, `/ops/events` UI, UI 풀테스트, 30분/120분 longrun, published
metadata, tag/push/GitHub Release PASS를 대체하지 않습니다.
