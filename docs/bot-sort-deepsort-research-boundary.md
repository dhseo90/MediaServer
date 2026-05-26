# BoT-SORT/DeepSORT Research Boundary

이 문서는 v1.8.0 (8) `BoT-SORT/DeepSORT research boundary`의 범위와
후속 분류를 고정합니다. 목표는 appearance/Re-ID 의존성이 큰 tracker 계열을
v1.8.0 runtime tracker로 조용히 승격하지 않고, dependency/privacy/bundle review가
열릴 때 필요한 research note 경계만 남기는 것입니다.

## 이번 v1.8.0 (8) 범위

포함:

- BoT-SORT/DeepSORT가 `analysis.trackingPolicy.tracker` 허용값이 아님을 문서와
  정적 verifier로 고정
- `/ops/rules`, rule validation, `AnalysisProfile`, `ObjectTrackerKind`,
  `verify-tracker-stability`, `compare-close-object-tracker`의 현재 tracker 후보가
  `none`, `lite`, `kalman-lite`, `bytetrack`에 머무는지 확인
- BoT-SORT/DeepSORT 계열 비교는 appearance/Re-ID model, embedding/crop,
  camera motion compensation, dataset provenance, runtime/model bundle policy를
  별도 review로 분리해야 함을 기록
- Event POST/WebRTC DataChannel/SSE/WS metadata schema와 RTSP/WebRTC media path를
  research note 근거로 변경하지 않는 경계를 기록

제외:

- 실제 BoT-SORT 또는 DeepSORT algorithm 구현
- BoT-SORT/DeepSORT를 rule-level tracker 선택값으로 추가
- BoT-SORT/DeepSORT 결과를 제품 tracker 교체 또는 default-on 근거로 사용
- Re-ID model artifact, embedding store, crop retention, model/runtime bundle 포함
- OC-SORT benchmark와 BoT-SORT/DeepSORT privacy/dependency review를 한 작업으로 묶기
- Event POST/WebRTC DataChannel/SSE/WS metadata schema 또는 RTSP/WebRTC media
  path 변경

## 검증

정적 boundary:

```bash
./server.sh verify-bot-sort-deepsort-research-boundary
```

관련 privacy/default-off boundary:

```bash
./server.sh verify-reid-advanced-tracking
```

BoT-SORT/DeepSORT 연구가 실제로 열릴 때는 별도 report에서 model card, license,
checksum, dataset provenance, privacy threat model, retention/redaction policy,
runtime/bundle policy를 먼저 검토합니다. 현재 상태에서 이 명령은 BoT-SORT 또는
DeepSORT를 실행하지 않습니다.

## 후속 분류

미분류 P0~P1 후속: 없음.

후속 Phase:

- BoT-SORT/DeepSORT dependency/privacy threat model
- Re-ID model card/license/checksum/provenance review
- appearance embedding/crop retention and redaction policy
- camera motion compensation 및 dataset benchmark report
- runtime/model bundle RC policy와 source-offer 검토

위 항목은 v1.8.0 (8)의 잔여가 아니라, 별도 privacy, benchmark, 또는 product
review가 열릴 때만 다룹니다.
