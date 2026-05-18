# OC-SORT Benchmark Boundary

이 문서는 v1.4.0 (7) `OC-SORT 후순위 benchmark`의 범위와 후속 분류를
고정합니다. 목표는 OC-SORT를 제품 tracker로 조용히 승격하지 않고,
Kalman-lite/ByteTrack 이후 별도 benchmark report가 열릴 때 필요한 기준만
남기는 것입니다.

## 이번 v1.4.0 (7) 범위

포함:

- OC-SORT가 `analysis.trackingPolicy.tracker` 허용값이 아님을 문서와 정적
  verifier로 고정
- `/ops/rules`, rule validation, `AnalysisProfile`, `ObjectTrackerKind`,
  `verify-tracker-stability`, `compare-close-object-tracker`의 현재 tracker 후보가
  `none`, `lite`, `kalman-lite`, `bytetrack`에 머무는지 확인
- benchmark 후보가 Re-ID 없이 motion/observation 중심으로만 비교돼야 함을 기록
- `matrix-ok`와 제품 default-on/교체 판단을 분리하기 위해
  `defaultOnDecision`, `productDefaultOn`, `candidateCount`, `defaultOnReason`을
  읽어야 함을 기록

제외:

- 실제 OC-SORT algorithm 구현
- OC-SORT를 rule-level tracker 선택값으로 추가
- OC-SORT 결과를 제품 tracker 교체 또는 default-on 근거로 사용
- Re-ID/BoT-SORT/DeepSORT/model artifact/privacy review를 이 항목에 포함
- Event POST/WebRTC DataChannel/SSE/WS metadata schema 또는 RTSP/WebRTC media
  path 변경

## 검증

정적 boundary:

```bash
./server.sh verify-oc-sort-benchmark-boundary
```

관련 privacy/default-off boundary:

```bash
./server.sh verify-reid-advanced-tracking
```

benchmark 후보가 실제로 열릴 때는 별도 report에서 기존 close-object fixture
matrix와 현재 runtime tracker 후보를 먼저 비교합니다. OC-SORT 구현이 없는 현재
상태에서 이 명령은 OC-SORT를 실행하지 않습니다.

```bash
./server.sh compare-close-object-tracker --fixture-matrix --tracker-policy bytetrack
```

## 후속 분류

미분류 P0~P1 후속: 없음.

후속 Phase:

- 실제 OC-SORT algorithm adapter와 dataset benchmark report
- ByteTrack/Kalman-lite/OC-SORT fixture matrix 비교 history
- field sample 기반 tracker replacement product review

위 항목은 v1.4.0 (7)의 잔여가 아니라, 별도 benchmark 또는 product review가
열릴 때만 다룹니다.
