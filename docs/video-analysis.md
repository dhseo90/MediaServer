# Video Analysis / VA Guide

이 문서는 MediaServer의 영상 분석(VA) 엔진, Rule/Scenario 구조, API, event payload를 설명합니다. UI 화면 사용법은 [ui-guide.md](./ui-guide.md), 환경변수 전체 목록은 [config-reference.md](./config-reference.md), 검증 이력은 [history/verification-history.md](./history/verification-history.md)를 봅니다.

## 1. VA 개요

VA는 기존 RTSP/WebRTC relay path를 대체하지 않고, 같은 source stream에 선택적으로 붙는 분석 계층입니다.

지원 입력:

- file source
- RTSP pull source
- WebRTC publish source의 소비 경로
- HTTP/HLS URI source
- 정적 이미지 분석 API

지원 출력:

- RTSP/WebRTC 영상 overlay
- analysis metadata JSON
- snapshot JPEG / overlay JPEG
- 기본 rule event JSON
- scenario event JSON
- opt-in Event POST
- opt-in EventRecord JSON Lines 저장
- opt-in WebRTC DataChannel metadata

일반 overlay는 `va=1`로 켭니다. 저장된 영상 분석 설정은 `vaRule=<숫자>`로 호출합니다. `vaRule` 요청은 저장된 source/profile/rule/scenario/geometry를 사용하므로 `file`, `url`, `source` override와 함께 쓰지 않습니다.

외부 이벤트 JSON/API/POST 형식은 기존 호환성을 유지합니다. TrackState, Scenario, TrackHealth, EventRecord는 내부 상태와 선택 저장 구조를 확장하는 용도이며 기존 Intrusion/LineCrossing event type을 바꾸지 않습니다.

## 2. VA Pipeline

```text
Source Stream
  -> Raw Video Decode
  -> YOLO/ONNX Detection
  -> Direction-Based Tracker
  -> TrackedObjectMetadata Adapter
  -> TrackStateManager
  -> SceneContextBuilder
  -> RuleEventEngine
  -> ScenarioEngine
  -> EventManager
  -> Overlay / Metadata / Event POST / EventRecord / WebRTC DataChannel
```

### YOLO/ONNX Detection

기본 detector는 YOLO/ONNX Runtime 경로입니다. 기본 모델은 `models/yolo11n.onnx`, label은 `models/coco.names` 기준입니다. 모델과 label 파일은 repo에 커밋하지 않고 로컬 `models/` 아래에 둡니다.

YOLO parser는 `YOLOv8/YOLO11` 계열의 `[1, 84, N]` 또는 `[1, N, 84]` 출력과, `YOLOv5` 계열의 objectness 포함 `[1, N, 85]` 출력을 대상으로 합니다.

지원 parser 옵션:

- `outputLayout=auto|channels-first|channels-last`
- `boxFormat=cxcywh|xyxy`
- `scoreMode=auto|class-only|objectness-class|score-class|class-score`

### Tracking

현재 tracker는 direction-based/lightweight tracker입니다. Kalman Filter, BoT-SORT, ByteTrack, 실제 Re-ID 모델을 기본 tracking id 생성에 사용하지 않습니다.

matching score는 다음 요소를 조합합니다.

- IoU score
- center distance score
- trail direction score
- class consistency score

unmatched track은 제한된 lost buffer에 남고, 짧은 누락 뒤 같은 class/object가 다시 matching되면 `reacquired` 상태로 관측됩니다.

### TrackStateManager

`TrackStateManager`는 stream/channel별 track map을 분리해서 관리합니다.

저장하는 상태:

- firstSeenTime
- lastSeenTime
- lostSince
- Active / Lost / Reacquired / Terminated lifecycle
- 최근 bbox, center, confidence, class, direction
- 최근 observation ring buffer
- downsampled trajectory
- TrackHealth
- optional AppearanceProfile

frame 원본은 장기 저장하지 않습니다. cleanup은 active track을 삭제하지 않고 Lost/Terminated/stale 상태만 대상으로 합니다.

### SceneContextBuilder

`SceneContextBuilder`는 TrackRuntimeState와 기존 rule/vaRule의 polygon/line region을 사용해 context만 계산합니다. 이벤트를 직접 발생시키지 않습니다.

계산 항목:

- ZoneState: currentZone, previousZone, enteredAt, exitedAt, dwellTimeMs, restricted zone 여부
- LineCrossState: previousSide, currentSide, crossed, rawDirection, allowedDirection, lastCrossTime
- optional ground point / ground trajectory

### RuleEventEngine

기존 기본 이벤트 owner입니다. presence, enter, exit, line-crossing을 평가하고 기존 event JSON/API/POST 형식을 유지합니다.

trackId가 있으면 TrackState/SceneContext를 사용하고, tracker가 꺼져 있거나 trackId가 없는 경우 기존 detection fallback을 사용합니다.

### ScenarioEngine

상태 머신 기반 상황 이벤트를 담당합니다. 기존 RuleEventEngine과 별도 계층이며, `IScenario` 구현체를 등록해 확장합니다.

대표 phase:

- Idle
- LineCrossed
- ZoneEntered
- Candidate
- Observing
- Confirmed
- Cooldown
- Ended

### EventManager

`EventManager`는 rule/scenario event lifecycle, dedupe, cooldown, cleanup을 담당합니다.

lifecycle key는 stream/channel, rule/scenario, zone/line, trackId를 기준으로 분리합니다. 같은 track/zone/scenario의 중복 이벤트를 억제하되, 기존 rule event의 외부 출력 형식은 유지합니다.

## 3. 분석 Profile

Profile은 detector와 분석 품질/성능 설정입니다.

주요 필드:

- detector: `yolo` 또는 검증용 `dummy`
- model path
- labels path
- FPS
- queue size
- confidence threshold
- NMS threshold
- input width/height
- tracking enabled
- tracking category/class list
- adaptive tuner 옵션

긴 환경변수와 기본값은 [config-reference.md](./config-reference.md)에 둡니다.

## 4. Rule 구조

저장된 `vaRule`은 source, profile, event/scenario, region, outputs를 하나의 숫자 ID로 묶습니다.

기본 구조:

```json
{
  "id": "1",
  "name": "lobby sample",
  "enabled": true,
  "source": {
    "kind": "file",
    "file": "sample_h264.mp4"
  },
  "analysis": {
    "profileId": "server-default-va",
    "classes": ["person", "vehicle"]
  },
  "event": {
    "type": "presence",
    "region": {
      "type": "polygon",
      "points": [
        { "x": 0.2, "y": 0.2 },
        { "x": 0.8, "y": 0.2 },
        { "x": 0.8, "y": 0.8 }
      ]
    },
    "minConfidence": 0.25,
    "minDurationMs": 0
  },
  "outputs": {
    "overlay": true,
    "metadata": true,
    "events": true
  }
}
```

Rule 구성 요소:

- source: file, RTSP URL, WebRTC source id, HTTP/HLS URI source
- profile: detector/FPS/threshold/tracking 설정
- event: 기본 이벤트 또는 scenario event 설정
- region: polygon 또는 line
- outputs: overlay, metadata, events, POST action

polygon 좌표는 normalized 0~1 비율입니다. line-crossing은 2점짜리 line과 방향(`any`, `forward`, `reverse`)을 사용합니다.

## 5. 기본 이벤트

기본 이벤트는 기존 rule event engine에서 평가합니다.

| 이벤트 | 설명 |
| --- | --- |
| `presence` | 대상 객체가 영역 안에서 감지됨 |
| `enter` | 대상 객체가 영역 밖에서 안으로 진입 |
| `exit` | 대상 객체가 영역 안에서 밖으로 이탈 |
| `line-crossing` | 대상 객체가 line을 통과 |

`line-crossing` 방향:

- `any`: 양방향
- `forward`: line 시작점에서 끝점 기준의 정방향
- `reverse`: 반대 방향

기본 이벤트는 기존 Intrusion/LineCrossing event type, JSON/API/POST field를 변경하지 않습니다.

## 6. 상황 기반 시나리오

Scenario는 여러 frame에 걸친 상태 전이와 시간 조건을 평가합니다. 기존 기본 이벤트와 별도 event type을 사용합니다.

| 시나리오 | 상태 | 이벤트 타입 |
| --- | --- | --- |
| IntrusionDwell | 구현됨, UI 템플릿 제공 | `intrusion-dwell` |
| ReEntry | 구현됨, 전용 UI 템플릿 후속 | `re-entry` |
| WrongDirection | 구현됨, 전용 UI 템플릿 후속 | `wrong-direction` |
| IntrusionAfterLineCrossing | 구현됨, 전용 UI 템플릿 후속 | `intrusion-after-line-crossing` |
| Loitering | 구현됨, 전용 UI 템플릿 후속 | `loitering` |

### IntrusionDwell

restricted zone에 들어온 person track이 일정 시간 이상 머무르면 1회 확정 이벤트를 발생시킵니다.

흐름:

```text
Idle -> Candidate -> Observing -> Confirmed -> Cooldown -> Ended
```

기본 개념:

- restricted zone 진입: Candidate
- 후보 시간 이상 유지: Observing
- dwell time 이상 체류: Confirmed
- 같은 track이 계속 zone 안에 있어도 중복 emit 없음
- zone 이탈 시 Ended

### ReEntry

같은 track이 target zone을 이탈한 뒤 설정 window 안에 같은 zone 또는 지정 zone으로 재진입하면 `re-entry` 이벤트를 1회 발생시킵니다.

### WrongDirection

line별 허용 방향과 실제 crossing 방향이 다르면 `wrong-direction` 이벤트를 발생시킵니다. 기존 `line-crossing` 이벤트는 그대로 유지합니다.

### IntrusionAfterLineCrossing

line crossing 이후 target zone에 진입하고 일정 시간 머무는 조합 상황을 평가합니다.

흐름:

```text
Idle -> LineCrossed -> ZoneEntered -> Observing -> Confirmed -> Cooldown -> Ended
```

### Loitering

target zone 내부 dwell time과 downsampled trajectory movement radius를 조합해 배회 상황을 판단합니다. 복잡한 행동 인식 모델 없이 trajectory 기반 최소 구현입니다.

## 7. TrackState / TrackHealth

TrackState는 track별 runtime 상태이고, TrackHealth는 direction-based tracking id 안정성 진단 metadata입니다.

TrackState 주요 값:

- streamId/channelId
- trackId
- lifecycle state
- firstSeenTime / lastSeenTime / lostSince
- bbox / center / confidence / class
- direction
- recent observations
- trajectory
- optional groundPoint
- optional AppearanceProfile

TrackHealth 주요 값:

- associationConfidence
- missedFrameCount
- overlapRisk
- directionChangeCount
- lastStableTime
- isUnstable
- lost/reacquired count

TrackingIssueReport는 `unstable-track`, `overlap-risk`, `missed-frame-spike`, `direction-change-spike`, `low-association-confidence`, `lost`, `reacquired`를 stream/channel별로 제한 수집합니다. 이 기능은 진단용이며 tracking id 생성 결과를 변경하지 않습니다.

## 8. Appearance / Re-ID Hook

AppearanceProfile과 IAppearanceExtractor는 향후 Re-ID/attribute 분석을 연결하기 위한 hook입니다.

현재 상태:

- 기본값은 비활성
- 기본 extractor는 `NoOpAppearanceExtractor`
- 실험용 ONNX Re-ID extractor hook은 모델 파일과 설정이 있을 때만 사용
- 모델 파일이 없거나 ONNX Runtime 빌드가 아니면 NoOp으로 fallback
- everyNSeconds, onTrackLost, onReacquireCandidate, onLowConfidenceAssociation 같은 policy trigger에서만 실행 후보 생성
- async queue, per-stream rate limit, global queue 상한, stale job drop으로 media pipeline blocking 방지

Re-ID/attribute 분석은 매 frame 실행 구조가 아닙니다.

## 9. Homography / Ground-Plane

Homography는 camera별 image point를 ground-plane point로 변환하는 optional 구조입니다.

현재 사용 방식:

- bbox bottom center를 image foot point로 사용
- stream/channel별 homography matrix 설정 가능
- 변환 실패 또는 미설정 시 image 좌표 fallback
- 기존 polygon/line event 판단은 즉시 ground-plane 좌표로 전면 교체하지 않음
- speed와 movement radius 계산에서 ground-plane 사용 옵션 제공
- Loitering movement radius는 ground trajectory가 있으면 우선 사용할 수 있음

단위와 matrix 설정은 [config-reference.md](./config-reference.md)에 정리합니다.

## 10. Event Payload

기존 외부 event POST payload는 `media-server.va.event.v1`입니다.

```json
{
  "schema": "media-server.va.event.v1",
  "eventId": "evt_1710000000000_1",
  "timestamp": "2026-04-30T00:00:00Z",
  "timestampMs": 1710000000000,
  "source": {
    "key": "file:sample_h264.mp4",
    "profileKey": "server-default-va",
    "sourceKind": "file",
    "route": "dhseo",
    "clientId": "",
    "pts": 123456789
  },
  "rule": {
    "id": "rule-1",
    "type": "presence"
  },
  "object": {
    "trackId": 7,
    "classId": 0,
    "class": "person",
    "confidence": 0.92,
    "bbox": {
      "x": 0.25,
      "y": 0.2,
      "width": 0.1,
      "height": 0.3
    }
  },
  "action": {
    "highlight": {
      "enabled": true,
      "mode": "blink",
      "color": "#ff0000",
      "durationMs": 1500
    },
    "post": {
      "enabled": true,
      "method": "POST",
      "payloadFormat": "media-server.va.event.v1"
    }
  }
}
```

Replay output의 `events[]`도 같은 핵심 구조를 유지합니다. 내부 TrackHealth snapshot은 `metadata_json` 안에 `media-server.va.event-track-health.v1` wrapper로 붙을 수 있지만, 외부 event field 이름은 유지합니다.

## 11. EventRecord / Snapshot / Clip Hook

EventRecord는 운영 조회와 snapshot/clip 연결을 위한 내부 저장 구조입니다. 기본값은 비활성입니다.

`media-server.va.event-record.v1` 필드:

- eventId
- eventType
- streamId/channelId
- trackId
- classId/className
- startTime / updateTime / endTime
- status
- zoneId / lineId
- scenarioName / scenarioPhase
- confidence
- snapshotPath
- clipPath
- preEventMs / postEventMs
- metadata

저장은 JSON Lines 파일 append 방식이며 DB 의존성은 없습니다. 저장 실패는 counter와 로그에 남기고 streaming/event 출력은 계속 진행합니다.

Snapshot/clip hook 상태:

- 기본 NoOp
- 활성화 시 현재 구현은 EventRecord와 연결 가능한 marker JSON을 생성
- 실제 frame bytes snapshot 저장과 pre/post clip recorder는 후속 작업
- pre/post buffer는 config로 제한

상태 API:

```bash
curl -fsS 'http://127.0.0.1:8080/lab/analysis/event-storage/status'
```

## 12. WebRTC VA Metadata DataChannel

WebRTC VA metadata DataChannel은 기본 off입니다. `vaMetadata=1` query 또는 관련 env로 명시적으로 켭니다.

메시지 schema:

```json
{
  "schema": "media-server.webrtc.va-metadata.v1",
  "streamId": "file:sample_h264.mp4",
  "channelId": "client-1",
  "profileKey": "server-default-va",
  "frameId": 123,
  "pts": 123456789,
  "timestampMs": 123456,
  "tracks": [
    {
      "trackId": 7,
      "bbox": { "x": 0.25, "y": 0.2, "width": 0.1, "height": 0.3 },
      "classId": 0,
      "className": "person",
      "confidence": 0.92,
      "currentZone": "restricted-zone",
      "previousZone": "",
      "dwellTimeMs": 3200,
      "insideRestrictedZone": true,
      "scenarioName": "intrusion-dwell",
      "scenarioPhase": "Observing",
      "lineState": { "lineId": "", "side": 0, "direction": "none" },
      "trackHealth": {
        "status": "stable",
        "stable": true,
        "associationConfidence": 0.91,
        "missedFrameCount": 0,
        "overlapRisk": 0,
        "directionChangeCount": 0
      }
    }
  ],
  "events": [
    {
      "eventId": "evt_1",
      "eventType": "intrusion-dwell",
      "status": "confirmed",
      "ruleId": "scenario:intrusion-dwell",
      "trackId": 7,
      "classId": 0,
      "className": "person",
      "confidence": 0.92,
      "zoneId": "restricted-zone",
      "lineId": "",
      "scenarioName": "intrusion-dwell",
      "scenarioPhase": "Confirmed"
    }
  ]
}
```

전송 주기와 message/buffer 상한은 config/query로 제한합니다. DataChannel 생성/전송 실패가 audio/video streaming 실패로 이어지면 안 됩니다.

## 13. Debug Overlay / State Dump

Debug overlay는 기본 off입니다. 특정 tap 또는 overlay 요청에서만 `debugOverlay=1`, `debugState=1`, `vaDebug=1` 중 하나를 지정해 켭니다.

표시/출력 항목:

- trackId
- className/confidence
- currentZone / previousZone
- dwellTimeMs
- line side / crossing direction
- scenarioName / scenarioPhase
- TrackHealth stable/unstable
- optional groundPoint
- speed value/units

API:

```bash
curl -fsS 'http://127.0.0.1:8080/lab/analysis/taps/{tapId}/state-dump'
curl -fsS 'http://127.0.0.1:8080/lab/analysis/taps/{tapId}/metrics'
curl -fsS 'http://127.0.0.1:8080/lab/analysis/taps/{tapId}/overlay.jpg?debugOverlay=1&drawLabels=1' -o va-debug-overlay.jpg
```

Debug 출력은 내부 상태 확인용이며 기존 event JSON/API/POST 형식을 바꾸지 않습니다.

## 14. Replay 검증

`replay-va-metadata`는 실제 RTSP/WebRTC pipeline 없이 detection/tracking metadata를 replay하는 도구입니다.

실행 예:

```bash
./server.sh replay-va-metadata \
  --input test/fixtures/va_replay/intrusion_dwell_metadata.json \
  --expect test/fixtures/va_replay/intrusion_dwell_expected.json \
  --timestamp-tolerance-ms 250

./server.sh verify-va-replay
```

입력 필드:

- streamId/channelId
- frameId
- timestampMs
- trackId
- classId/className
- confidence
- bbox
- center
- direction

도구가 호출하는 계층:

- TrackStateManager
- SceneContextBuilder
- RuleEventEngine
- ScenarioEngine
- EventManager

출력 schema는 `media-server.va.metadata-replay.v1`입니다. baseline 비교는 event type, streamId, channelId, trackId, zoneId, lineId, timestamp tolerance를 기준으로 합니다.

현재 replay baseline 범위:

- Intrusion / presence
- LineCrossing
- IntrusionDwell
- ReEntry
- WrongDirection
- IntrusionAfterLineCrossing
- Loitering
- cleanup
- lost/reacquired
- 동일 trackId 다채널 분리

현재 검증 명령과 기준은 [stream-verification.md](./stream-verification.md)에 둡니다. 과거 날짜별 이력은 [history/verification-history.md](./history/verification-history.md)를 봅니다.

## 15. 제한사항

- Tracker는 여전히 direction-based/lightweight tracker입니다. Kalman Filter, BoT-SORT, ByteTrack은 도입하지 않았습니다.
- 실제 Re-ID/attribute 분석은 기본 비활성입니다. 실험용 ONNX Re-ID extractor hook은 있지만 운영 feature로 보려면 모델, 성능, 개인정보 정책 검증이 필요합니다.
- EventRecord 저장은 기본 비활성입니다.
- snapshot/clip hook은 현재 marker/hook 중심입니다. 실제 snapshot frame extraction과 pre/post clip recorder는 후속 작업입니다.
- Homography는 optional입니다. 설정이 없거나 실패하면 image 좌표 fallback을 사용합니다.
- ScenarioEngine은 기존 RuleEventEngine과 별도입니다. 기존 Intrusion/LineCrossing event를 끄거나 바꾸지 않습니다.
- UI 상세 사용법은 [ui-guide.md](./ui-guide.md)에 있습니다. 이 문서는 UI 조작법을 길게 다루지 않습니다.
- 긴 환경변수 표는 [config-reference.md](./config-reference.md)에 있습니다.
- 긴 검증 이력은 [history/verification-history.md](./history/verification-history.md)에 있습니다.
