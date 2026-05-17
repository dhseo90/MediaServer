# Re-ID Default-off Research Continuation

이 문서는 v1.3.0 `V130-P2-02 Re-ID default-off research continuation`
범위의 연구 지속 기준입니다. 목표는 close-object tracker 비교와 Re-ID privacy
문구를 유지하면서 default-on 근거가 충분한지 별도 research로만 관찰하는 것입니다.

## 범위

포함:

- close-object guard `off`, `diagnostic`, `enforce` 비교 결과를 연구 report로 수집
- `verify-close-object-fixture-matrix`의 clean gate와 `compare-close-object-tracker
  --fixture-matrix`의 관찰 report를 구분
- matrix history에 `defaultOnDecision`, `productDefaultOn`, `candidateCount`,
  `defaultOnReason`을 남겨 회차별 판단 흐름을 보존
- `verify-reid-advanced-tracking`으로 default-off, privacy, benchmark command
  boundary를 정적으로 확인

제외:

- Re-ID default-on
- Kalman, ByteTrack, BoT-SORT 같은 대형 tracker 교체
- 실제 Re-ID model artifact를 release asset 또는 runtime bundle에 포함
- Event POST, WebRTC DataChannel, SSE/WS metadata schema 변경
- RTSP/WebRTC media path 변경
- client/viewer에 source URL, raw JSON, debug/identity material 노출

## 실행 기준

정기 clean gate:

```bash
./server.sh verify-close-object-fixture-matrix
```

연구 history를 남기는 관찰 실행:

```bash
./server.sh compare-close-object-tracker \
  --fixture-matrix \
  --history-dir /tmp/media_server_reid_research_history
```

privacy/default-off 정적 gate:

```bash
./server.sh verify-reid-advanced-tracking
```

문서 전용 변경도 마지막에 실행합니다.

```bash
git diff --check
```

## 판정 필드

`matrix-ok`는 명령/gate 결과이며 제품 default-on 승인 값이 아닙니다. 제품 기본값
판단은 matrix summary/report와 history index의 아래 필드를 함께 읽습니다.

| 필드 | 의미 |
| --- | --- |
| `defaultOnDecision` | `not-promoted` 또는 `review-required` 같은 연구 판단 상태 |
| `productDefaultOn` | 제품 기본 활성화 여부. 이 연구 범위에서는 항상 `False` |
| `candidateCount` | 단독 fixture 기준 후보 수 |
| `defaultOnReason` | default-off 유지 또는 별도 review 필요 사유 |
| `holdCount` / `warningCount` | default-on 검토를 중단하거나 반복 관찰해야 하는 fixture 수 |

`review-required`가 나오더라도 제품 default-on 완료가 아닙니다. 모든 fixture가 단독
후보여도 별도 field/model review와 제품 결정이 필요합니다.

## 현재 결론

2026-05-17 KST 기준으로 `tracking-event`, `tracking-event-long`,
`tracking-event-slow-long`, `four-scene-control`은 단독 fixture 후보로 기록됐지만,
`field-new-york-driving`은 `warning/defaultOnCandidate=false`입니다.
따라서 close-object guard와 Re-ID hook은 계속 default-off/opt-in 상태로 둡니다.

`V130-P2-02`에서 개발 가능한 후속 이슈는 다음 조건이 모두 통과하면 남기지
않습니다.

- matrix history가 `defaultOnDecision`, `productDefaultOn`, `candidateCount`,
  `defaultOnReason`을 보존
- `verify-reid-advanced-tracking`이 v1.3.0 (8) 문서, privacy/default-off,
  benchmark/history boundary를 검증
- `compare-close-object-tracker` 또는 `verify-close-object-fixture-matrix` 결과를
  제품 default-on 완료 근거로 과장하지 않음
- `git diff --check` 통과

미확인 또는 별도 Phase:

- 실제 Re-ID model artifact 기반 field 검증
- default-on 제품 결정
- 대형 tracker 교체
- runtime/model bundle 포함 배포
