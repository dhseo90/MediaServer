# 시나리오 타임라인 진단

분석 개발자와 운영자가 시나리오의 상태 전이·발행·억제를 읽기 전용으로 추적하는 안내입니다.
현재 Lab state-dump의 필드와 Ops 대시보드 요약을 설명하며, 과거 완료·RC 판정이나
이번 실행의 PASS를 나타내지 않습니다.

시나리오 판단과 설정은 [VA 가이드](./video-analysis.md), 화면 사용법은
[UI 가이드](./ui-guide.md#13-운영-진단과-이벤트-검토), 공개 전달 계약은
[Live Event and Metadata Contracts](./live-event-metadata-contracts.md)를 따릅니다.
후속 방향은 [backlog](./development-backlog.md)와 구분합니다.

## 범위와 권한

현재 입력은 `GET /lab/analysis/taps/{tapId}/state-dump`의
`analyticsState.debugState.scenarioTimeline[]`입니다.
`/lab/analysis/taps/{tapId}/metrics`의 TrackHealth issue report와
`/lab/analysis/taps/{tapId}/events` buffer는 별도 진단 입력입니다.

Lab route가 활성화되어 있어야 하며, admin/operator 또는 `lab:read` scope가 필요합니다.
Ops 화면은 admin/operator와 `ops:read` 경계를 추가로 따릅니다.
이 debug object와 내부 correlation key를 client/viewer API에 노출하지 않습니다.

다음은 이 문서의 변경·완료 범위가 아닙니다.

- ScenarioEngine 판단, Intrusion/LineCrossing event type 변경
- Event POST/WebRTC DataChannel/SSE/WS payload schema 변경
- Re-ID default-on, tracker 교체, 사람 attribute·face·license plate 분석
- 타임라인 표시만으로 현장 오탐/미탐 개선이나 전체 UI 검증을 완료했다고 판정

## 상태를 만드는 곳

타임라인은 새 판단 owner가 아닙니다. 기존 상태를 읽기 전용으로 조합합니다.

| 구현 | 타임라인과의 관계 |
| --- | --- |
| `TrackStateManager` / `SceneContextBuilder` | track/class, zone 진입·체류, line side/crossing 문맥 |
| `ScenarioEngine` | instance의 이전/현재 phase, 진입·관측·cooldown 시각 |
| `EventManager` | 해당 시나리오와 연결된 발행·억제 count, 최근 event·cooldown 상태 |
| `BuildScenarioTimelineItem` / `BuildDebugState` | 위 상태를 debug DTO로 조합하고 정렬 |
| HTTP serializer | 미제공 시각을 `null`로 내보냄 |
| Ops 대시보드 | 선택된 tap의 결과를 카드와 필터로 요약 |

`/events` buffer는 최근 이벤트를 함께 판독하는 보조 자료입니다.
타임라인의 count·최근 event 필드는 현재 EventManager lifecycle snapshot에서 오며,
buffer를 다시 집계해 판단하거나 EventRecord 저장 성공을 증명하지 않습니다.

## 현행 필드 계약

`scenarioTimeline` 원소의 필드는 다음과 같습니다. 공개 전송 schema에 추가하는 제안이
아니라 현재 state-dump serializer의 필드입니다.

| 필드 | 해석 |
| --- | --- |
| `instanceKey`, `dedupeKey` | debug correlation 키. 외부 event ID로 사용하지 않음 |
| `streamId`, `channelId`, `ruleId` | 분석 문맥과 저장 룰 연결 |
| `scenarioKey`, `scenarioName` | instance 계열 key와 scenario 종류 |
| `trackId`, `classId`, `className` | 관련 track와 class. class가 없으면 `classId=-1` 가능 |
| `zoneId`, `lineId` | 현재 scene context의 영역·라인 요약 |
| `currentPhase`, `previousPhase` | 현재/이전 phase |
| `phaseEnteredAtMs`, `phaseElapsedMs` | 현재 phase 진입 시각과 경과 시간 |
| `trackFirstSeenAtMs`, `trackLastSeenAtMs` | 해당 scenario instance의 최초/최근 관측 시각 |
| `zoneEnteredAtMs`, `lineCrossedAtMs` | 연결된 zone 진입·line 통과 시각 |
| `eventEmittedAtMs` | 연결된 lifecycle의 최근 발행 시각 |
| `cooldownStartedAtMs`, `cooldownEndsAtMs`, `cooldownRemainingMs` | cooldown 시작·종료·잔여 시간 |
| `lastEventId`, `lastEventStatus` | 최근 event 연결. ID 생성 전에는 빈 문자열 가능 |
| `eventEmittedCount`, `dedupeSuppressedCount` | 연결된 lifecycle의 발행·억제 누적 count |
| `active` | active phase 여부. 단순히 `ended`가 아닌 모든 phase를 뜻하지 않음 |

예를 들어 `currentPhase="confirmed"`, `previousPhase="observing"`는 API 값입니다.
Ops의 `Confirmed`/`Observing` badge는 표시 label이며 API phase 이름을 바꾸지 않습니다.
현재 active는 `line-crossed`, `zone-entered`, `candidate`, `observing`,
`confirmed` phase입니다. `cooldown`·`ended`·`idle`은 active가 아닙니다.

### 시각·결측값 해석

현재 계산 기준은 분석 결과의 PTS입니다. `debugState.timestampMs`는 `result.pts`의
ns→ms 변환이며 scenario·scene·event lifecycle도 같은 분석 시간 문맥으로 조합합니다.
`*AtMs`를 UTC 날짜·녹화 검색 시각·서버 wall-clock이라고 해석하지 않습니다.

- 이 debug 경로는 ns 시각이 0 이하이면 미제공으로 처리합니다. 내부 음수 sentinel은
  HTTP에서 `null`이 됩니다. 모든 0을 날짜나 유효 관측으로 해석하지 않습니다.
- 알 수 없는 경과 시간도 `null`이며, 계산 가능한 경과·cooldown 잔여 시간은 음수를 0으로 clamp합니다.
- `trackFirstSeenAtMs`는 scenario 신규 생성·재활성화 시각일 수 있으므로 track 전체 생존 기간과 같지 않습니다.
- `lineId`/`lineCrossedAtMs`는 현재 scene context의 첫 line 상태 요약입니다.
  여러 line 중 특정 trigger의 완전한 이력이라고 해석하지 않습니다.
- lifecycle과 매칭되지 않으면 event ID/status가 비어 있고 count가 0일 수 있습니다.
  `instanceKey`/`dedupeKey`는 instance 기반 fallback key를 사용할 수 있습니다.

`debugState` 자체가 제공되지 않거나 `scenarioTimeline`이 빈 배열인 경우를 구분합니다.
분석 debug 요청 여부, 활성 tap·scenario·track·geometry를 확인하며,
빈 결과를 이벤트 없음이나 정상 판정의 증거로 자동 승격하지 않습니다.

## 현재 Ops 표시와 개발 API

`/ops/dashboard`는 대상 tap의 state-dump/metrics를 읽어 Scenario Timeline과
TrackHealth issue grouping을 표시합니다. tap 선택은 유효한 URL hash `tap`,
저장 룰이 선택된 tap, 첫 활성 tap 순입니다. 세부 운영 순서는 UI 가이드를 따릅니다.

현재 타임라인은 최대 8개 카드를 표시합니다. phase badge, rule/track/zone/line 문맥,
phase elapsed, cooldown 잔여 시간, 발행·중복제거 count, phase 진입과 instance 관측 시각을
요약합니다. scenario·rule·track·phase·zone·line 키워드로 좁힐 수 있습니다.

API 목록은 active 우선·진입 시각 내림차순이며, Ops는 표시용 phase 우선순위와
최근 시각으로 다시 정렬합니다. 두 순서를 동일하다고 가정하지 않습니다.
필터 결과 없음, 활성 인스턴스 없음, tap 없음과 조회 오류도 구분합니다.

예전 초안의 cooldown progress bar, 접힘 detail row, raw JSON 패널이 모두 현재
제품에 있다는 뜻은 아닙니다. 원문은 권한이 있는 Lab API에서 확인하고,
현재 Ops summary를 전체 field의 표시·전수 관측으로 보지 않습니다.
타임라인에는 판단 값을 직접 수정하는 action이 없습니다.

## 호환성과 오류 경계

- 시각·phase·correlation은 debug/state-dump 계층에 둡니다.
- Event POST, WebRTC DataChannel, SSE/WS contract에 별도 schema review 없이 추가하지 않습니다.
- scenario phase 이름과 외부 event type을 혼동하지 않습니다.
- 타임라인 직렬화·표시 실패가 event emit, overlay, metadata delivery를 막아서는 안 됩니다.
- TrackHealth grouping은 튜닝 참고이며 tracker/Re-ID 자동 변경이나 default-on 근거가 아닙니다.

현장 샘플에 따른 표시 우선순위와 threshold 재튜닝은 운영 데이터 기반 후속 후보이며,
이 진단 UI의 구현·검증 완료와 구분합니다.

## 확인 명령과 합격 범위

문서만 바꾼 경우의 최소 확인:

```bash
git diff --check -- docs/scenario-timeline-debug.md
./server.sh verify-docs-links
```

승인된 격리 서버에서 runtime JSON 경로를 확인하는 예시:

```bash
./server.sh verify-va-runtime-console --http-base http://127.0.0.1:8080
```

이 verifier는 tap을 만들고 runtime/metrics/state-dump 등을 조회합니다.
debugState가 제공될 때 `scenarioTimeline`의 배열 형식을 확인하지만,
모든 phase·시각·negative와 실제 화면을 전수 검증하지 않습니다.
운영 서버에 그대로 실행하지 않으며 실제 주소·인증 격리·원출력·cleanup은
[검증 정책](./stream-verification.md#검증-정책)을 따릅니다.

관련 구현을 바꿀 때는 영향에 따라 `./server.sh build`,
`./server.sh verify-analysis-state`, `./server.sh verify-va-replay`,
`./server.sh verify-ops-scenario-presets`, `./server.sh verify-rule-ui`를 선택합니다.
UI 확인이 필요하면 별도 승인과 적격 조건 아래
`./server.sh verify-ops-client-ui --screenshots`와 실제 UI 테스트를 구분합니다.

정상 phase 전이·count 연결뿐 아니라 미제공 시각, 빈 목록, 만료/종료 instance,
반복 억제·cooldown, 다중 line과 viewer 접근 거부를 독립 기대값으로 확인합니다.
명령 목록·정적 PASS·과거 완료 기록만으로 runtime/UI/장시간 PASS를 주장하지 않습니다.
