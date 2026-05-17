# Analysis Threshold Baselines

이 문서는 Loitering과 ZoneOccupancy 현장 적용 전 기준값을 정리합니다.
값은 운영 시작점입니다.
실제 현장 CCTV에서는 privacy/retention 정책과 오탐 허용치를 먼저 확정한 뒤 조정합니다.

2026-05-12 순차 close-out 기준으로 이 baseline은 선수 로드맵 4/6
Live VA Event Quality 완료 범위에 포함됩니다. 실제 현장 영상 기반 재튜닝은
RC 잔여 blocker가 아니라 운영 데이터 기반 확장 후보입니다.

기본 추가 RTSP/WebRTC 느린 영상 검증은 이 문서의 필수 테스트에 포함하지 않습니다.
다음 검증은 rule payload, replay/mock, UI smoke 중심으로 수행합니다.

## Loitering

| 현장 유형 | dwell ms | radius | min points | cooldown ms | 비고 |
| --- | ---: | ---: | ---: | ---: | --- |
| retail aisle | 20000 | 0.06 | 4 | 10000 | 매대 앞 체류를 빠르게 잡는 시작값 |
| lobby | 30000 | 0.08 | 4 | 12000 | 안내/대기 움직임을 일부 허용 |
| platform | 45000 | 0.10 | 5 | 15000 | 보행 흐름과 대기를 구분하기 위해 dwell을 길게 둠 |
| doorway | 15000 | 0.05 | 3 | 8000 | 출입구 막힘/정체 감지용, 오탐이 높으면 dwell부터 증가 |
| parking edge | 60000 | 0.12 | 5 | 20000 | 차량/보행 혼재 구간은 가장 보수적으로 시작 |

조정 순서:

1. 동일 track이 계속 유지되는지 TrackHealth와 missed frame count를 먼저 확인합니다.
2. 짧은 오탐은 dwell ms를 5초 단위로 증가시킵니다.
3. 왕복 보행이 loitering으로 잡히면 radius를 낮추기보다 min points를 먼저 올립니다.
4. Ground-plane calibration이 있는 현장에서는 radius를 image 기준이 아닌 ground 기준으로 다시 산정합니다.

## ZoneOccupancy

| 현장 유형 | threshold | min dwell ms | cooldown ms | 비고 |
| --- | ---: | ---: | ---: | --- |
| queue | 4 | 7000 | 12000 | 계산대/대기열 시작값 |
| lobby | 6 | 10000 | 15000 | 넓은 대기 공간 시작값 |
| platform | 8 | 5000 | 10000 | 순간 혼잡을 빠르게 잡되 threshold를 높게 둠 |
| doorway | 3 | 3000 | 8000 | 출입구 정체 시작값 |
| elevator hall | 5 | 8000 | 12000 | 승강기 대기 오탐 방지용 dwell 필요 |

조정 순서:

1. polygon이 실제 병목 구간만 포함하는지 먼저 확인합니다.
2. 정상 피크 시간대에도 계속 confirmed이면 threshold를 올립니다.
3. 순간 통과가 잡히면 min dwell ms를 올립니다.
4. 같은 혼잡이 반복 emit되면 cooldown ms를 올립니다.

## LineCrossing

`line-crossing`은 scenario가 아니라 기본 이벤트입니다.
Preset은 저장 payload schema를 늘리지 않고 `event.minConfidence` 시작값만 채웁니다.
`event.minDurationMs`는 0으로 유지하며, 실제 crossing 판단은 2점 line geometry와
방향(`any`/`forward`/`reverse`)을 현장 영상에서 확인해 정합니다.

| 현장 유형 | min confidence | min duration ms | 비고 |
| --- | ---: | ---: | --- |
| default | 0.25 | 0 | 일반 시작값 |
| road | 0.35 | 0 | 차로/교차부 오탐을 줄이기 위해 신뢰도를 높게 시작 |
| retail aisle | 0.30 | 0 | 매장 통로 이동을 빠르게 확인 |
| lobby | 0.32 | 0 | 출입/대기 동선이 섞이는 공간 |
| platform | 0.35 | 0 | 승강장 경계 line을 보수적으로 시작 |
| doorway | 0.32 | 0 | 문 앞 병목 line을 빠르게 확인 |
| parking edge | 0.35 | 0 | 보행/차량 혼재 구간에서 신뢰도를 높게 시작 |
| elevator hall | 0.32 | 0 | 승강기 대기열 진입/이탈 확인 |

조정 순서:

1. line 두 점이 실제 통과 경계와 맞는지 먼저 확인합니다.
2. 방향 이벤트가 반대로 나오면 direction을 바꾸고, `any`는 양방향 확인용으로만 둡니다.
3. 짧은 오탐은 confidence를 올리기 전에 line 위치와 tracker 안정성을 먼저 봅니다.

## Ops UI preset mapping

`/ops/rules`의 현장 preset은 아래 baseline을 draft payload에 채웁니다.
Scenario 판단은 preset label이 아니라 저장된 숫자 threshold를 사용합니다.
LineCrossing은 기본 이벤트이므로 preset label을 별도 field로 저장하지 않고
기존 `event` 숫자와 line geometry만 저장합니다.

| Preset | LineCrossing | Loitering | ZoneOccupancy |
| --- | --- | --- | --- |
| `default` | confidence 0.25, duration 0, direction manual | dwell 30000, radius 0.08, min points 4, cooldown 12000 | threshold 4, min dwell 7000, cooldown 12000 |
| `road` | confidence 0.35, duration 0, direction manual | dwell 60000, radius 0.12, min points 5, cooldown 20000 | threshold 8, min dwell 5000, cooldown 10000 |
| `retail` | confidence 0.30, duration 0, direction manual | dwell 20000, radius 0.06, min points 4, cooldown 10000 | threshold 4, min dwell 7000, cooldown 12000 |
| `park` | confidence 0.30, duration 0, direction manual | dwell 60000, radius 0.12, min points 5, cooldown 20000 | threshold 6, min dwell 10000, cooldown 15000 |
| `indoor` | confidence 0.30, duration 0, direction manual | dwell 20000, radius 0.06, min points 4, cooldown 10000 | threshold 4, min dwell 7000, cooldown 12000 |
| `lobby` | confidence 0.32, duration 0, direction manual | dwell 30000, radius 0.08, min points 4, cooldown 12000 | threshold 6, min dwell 10000, cooldown 15000 |
| `platform` | confidence 0.35, duration 0, direction manual | dwell 45000, radius 0.10, min points 5, cooldown 15000 | threshold 8, min dwell 5000, cooldown 10000 |
| `entrance` | confidence 0.32, duration 0, direction manual | dwell 15000, radius 0.05, min points 3, cooldown 8000 | threshold 3, min dwell 3000, cooldown 8000 |
| `doorway` | confidence 0.32, duration 0, direction manual | dwell 15000, radius 0.05, min points 3, cooldown 8000 | threshold 3, min dwell 3000, cooldown 8000 |
| `parking` | confidence 0.35, duration 0, direction manual | dwell 60000, radius 0.12, min points 5, cooldown 20000 | threshold 5, min dwell 10000, cooldown 15000 |
| `elevator` | confidence 0.32, duration 0, direction manual | dwell 30000, radius 0.08, min points 4, cooldown 12000 | threshold 5, min dwell 8000, cooldown 12000 |

운영자는 preset 적용 뒤 숫자값을 수정해 저장할 수 있으며,
저장 payload에는 `scenario.presetId`와 실제 threshold 숫자가 함께 남습니다.
LineCrossing은 scenario가 아니므로 `scenario.presetId` 없이 기존 event payload만
저장됩니다.

## Verification

빠른 검증:

```bash
node --check scripts/internal/verify_ops_rules_embed_smoke.mjs
./server.sh verify-analysis-state
./server.sh verify-ops-rule-validation-matrix
./server.sh verify-ops-scenario-presets
./server.sh verify-rule-ui
./server.sh build
```

UI smoke:

```bash
./server.sh verify-rule-ui --http-base http://127.0.0.1:8081
```

장기 안정화나 실제 영상 튜닝은 별도 현장 샘플 절차로 분리합니다.
기본 추가 RTSP/WebRTC 영상은 느리므로 이 빠른 검증 묶음에서는 사용하지 않습니다.
