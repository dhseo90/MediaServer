# Scenario Timeline Debug Fields

이 문서는 v1.1.0 Live VA Event Quality 단계의 Scenario timeline/debug
필드 확장 초안을 정의합니다. 목적은 운영자가 situation event의 오탐/미탐
원인을 읽기 전용으로 추적하게 하는 것입니다.

이 문서는 설계 기준입니다. 현재 단계에서 scenario 판단 로직,
Event POST payload, WebRTC DataChannel schema, SSE/WS metadata schema는
변경하지 않습니다.

관련 기준:

- [v1.1.0 Roadmap](./v1.1.0-roadmap.md)
- [Video Analysis / VA Guide](./video-analysis.md)
- [Live Event and Metadata Contracts](./live-event-metadata-contracts.md)

## 범위

포함:

- phase entered time
- phase elapsed time
- cooldown remaining
- track first/last seen 요약
- zone/line state transition 요약
- event emitted/dedup/cooldown marker
- vaRule runtime debug와 Scenario Timeline table의 읽기 전용 표시 기준

비범위:

- ScenarioEngine 판단 로직 변경
- Intrusion/LineCrossing event type 변경
- Event POST/WebRTC/SSE/WS payload schema 변경
- client/viewer 화면 노출
- Re-ID default-on, tracker 교체, 사람 attribute/face/license plate 분석

## Data Source Boundary

Scenario timeline은 새 판단 owner가 아닙니다. 기존 owner가 만든 상태를
읽기 전용으로 모아 보여줍니다.

| Source | 역할 |
| --- | --- |
| `TrackStateManager` | track first/last seen, lifecycle, TrackHealth |
| `SceneContextBuilder` | zone enter/exit, dwell, line side/crossing |
| `ScenarioEngine` | scenario instance phase와 phase transition |
| `EventManager` | event emit, dedupe, cooldown, cleanup state |
| `/events` buffer | recent event marker와 eventId/status 연결 |

## Proposed Debug Fields

후보 state-dump 또는 runtime debug extension:

```json
{
  "scenarioTimeline": [
    {
      "instanceKey": "stream-1:rule-1:intrusion-dwell:track-7:zone-restricted",
      "streamId": "stream-1",
      "channelId": "dhseo",
      "ruleId": "1",
      "scenarioName": "intrusion-dwell",
      "trackId": 7,
      "className": "person",
      "zoneId": "restricted-zone",
      "lineId": "",
      "currentPhase": "Confirmed",
      "previousPhase": "Observing",
      "phaseEnteredAtMs": 123450,
      "phaseElapsedMs": 2200,
      "trackFirstSeenAtMs": 118000,
      "trackLastSeenAtMs": 125650,
      "zoneEnteredAtMs": 120100,
      "lineCrossedAtMs": null,
      "eventEmittedAtMs": 123500,
      "cooldownStartedAtMs": 123500,
      "cooldownEndsAtMs": 153500,
      "cooldownRemainingMs": 27850,
      "lastEventId": "evt_42",
      "lastEventStatus": "confirmed",
      "dedupeKey": "rule-1:intrusion-dwell:track-7:zone-restricted",
      "dedupeSuppressedCount": 0
    }
  ]
}
```

필드 원칙:

- time field는 같은 clock domain에서 계산합니다.
- 구현 시 `*AtMs`는 runtime monotonic 기준 또는 명확히 문서화된 frame/server 기준
  중 하나로 통일합니다.
- 알 수 없는 값은 `0` 대신 `null`로 둡니다.
- `cooldownRemainingMs`는 음수가 되지 않게 `0`으로 clamp합니다.
- `instanceKey`와 `dedupeKey`는 debug correlation용이며 외부 event contract가 아닙니다.
- client/viewer API에는 이 debug object를 노출하지 않습니다.

## UI Draft

Runtime Dashboard / vaRule Runtime Debug:

- scenario instance별 phase chip 표시
- current phase entered time과 elapsed time 표시
- cooldown phase는 remaining time bar로 표시
- recent event marker는 `eventId`, `eventType`, `status`만 요약
- dedupe/cooldown으로 event가 억제된 경우 badge로 표시
- track/zone/line context는 detail row에서 접어서 표시
- raw JSON은 운영자 debug details 접힘 영역에서만 허용

Scenario Timeline table:

- 기본 정렬: 최근 transition 또는 active phase 우선
- 필터: scenarioName, ruleId, trackId, phase
- 강조: stale/lost track, cooldown remaining, repeated dedupe suppression
- 직접 수정 action 없음

## Compatibility Rules

- 이 필드는 debug/state-dump 계층입니다.
- Event POST payload에는 추가하지 않습니다.
- WebRTC DataChannel metadata schema에는 추가하지 않습니다.
- SSE/WS runtime metadata contract에는 별도 schema review 없이 추가하지 않습니다.
- ScenarioEngine phase 이름을 바꿔 외부 event type과 혼동시키지 않습니다.
- timeline 표시 실패가 event emit, overlay, metadata delivery를 막으면 안 됩니다.

## Verification Plan

문서/설계 단계:

```bash
git diff --check -- README.md docs
./server.sh verify-docs-links
```

구현 단계 후보:

```bash
./server.sh build
./server.sh verify-rule-ui
./server.sh verify-analysis-state
./server.sh verify-va-replay
./server.sh verify-va-runtime-console
```

UI screenshot 확인이 필요한 경우:

```bash
./server.sh verify-ops-client-ui --screenshots
```
