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

## v1.5.0 (7) OC-SORT experimental sandbox

v1.5.0 (7)은 v1.4.0 boundary를 유지하면서 OC-SORT를 명시적 비교 sandbox로만
열어 둡니다. 이 sandbox는 `manifest-only` 상태이며 실제 OC-SORT algorithm
adapter, runtime tracker policy, `/ops/rules` 선택값을 추가하지 않습니다.

포함:

- `compare-close-object-tracker --experimental-sandbox oc-sort`가 report,
  matrix, history index에 `experimentalSandbox` manifest를 남김
- `compare-close-object-tracker --list-experimental-sandboxes`로 sandbox 목록과
  `runtimeTrackerPolicy=""`, `algorithmAdapter=false`, `productDefaultOn=false`
  상태를 확인
- `test/fixtures/v150_oc_sort_experimental_sandbox.json`으로 allowed/rejected
  tracker policy, retained/excluded evidence, 후속 분류를 고정
- 기존 runtime tracker 후보(`lite`, `kalman-lite`, `bytetrack`) 중 사용자가
  명시한 값으로만 close-object 비교 실행

제외:

- 실제 OC-SORT algorithm adapter 구현
- OC-SORT를 `analysis.trackingPolicy.tracker` 또는 `/ops/rules` option으로 추가
- OC-SORT 결과를 tracker default-on, Re-ID default-on, 제품 tracker 교체 근거로 사용
- Event POST/WebRTC DataChannel/SSE/WS metadata schema 또는 RTSP/WebRTC media path 변경

검증:

```bash
./server.sh verify-v150-oc-sort-experimental-sandbox
./server.sh compare-close-object-tracker --list-experimental-sandboxes
```

미분류 P0~P1 후속: 없음.

세부 후속 Phase 분류는 아래 `후속 분류` 섹션 하나를 source-of-truth로 둡니다.

## 후속 분류

미분류 P0~P1 후속: 없음.

후속 Phase:

- 실제 OC-SORT algorithm adapter와 dataset benchmark report
- ByteTrack/Kalman-lite/OC-SORT fixture matrix 비교 history
- field sample 기반 tracker replacement product review

위 항목은 v1.4.0 (7)의 잔여가 아니라, 별도 benchmark 또는 product review가
열릴 때만 다룹니다.
