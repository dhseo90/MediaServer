# Analysis Threshold Baselines

이 문서는 Loitering과 ZoneOccupancy 현장 적용 전 기준값을 정리합니다.
값은 운영 시작점입니다.
실제 현장 CCTV에서는 privacy/retention 정책과 오탐 허용치를 먼저 확정한 뒤 조정합니다.

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

## Verification

빠른 검증:

```bash
node --check scripts/internal/verify_ops_rules_embed_smoke.mjs
./server.sh verify-analysis-state
./server.sh verify-ops-rule-validation-matrix
./server.sh build
```

UI smoke:

```bash
./server.sh verify-rule-ui --http-base http://127.0.0.1:8081
```

장기 안정화나 실제 영상 튜닝은 별도 현장 샘플 절차로 분리합니다.
기본 추가 RTSP/WebRTC 영상은 느리므로 이 빠른 검증 묶음에서는 사용하지 않습니다.
