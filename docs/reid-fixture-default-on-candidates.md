# Re-ID Fixture Default-on Candidates

이 문서는 V120-P2-02 Re-ID/advanced tracking experiment에서
close-object guard의 `defaultOnCandidate` 판정을 fixture별로 분리해 기록합니다.
전체 제품 default-on 결정 문서가 아닙니다.

확인 기준:

- 기준일: 2026-05-17 KST
- 명령: `./server.sh verify-close-object-fixture-matrix`
- history: `/private/tmp/media_server_reid_full_matrix_20260517`
- summary: `/tmp/media_server_close_object_tracker_1778947054_1446/matrix-summary.json`
- matrix result: `matrix-ok=True`
- 전체 판정: V120-P2-02는 `WARNING(실험 유지)`

Fixture별 판정:

| fixture | judgement | defaultOnCandidate | 권고 | 해석 |
| --- | --- | --- | --- | --- |
| `tracking-event` | `pass` | `True` | `candidate: no event delta or risk increase observed; still require more field samples` | 2026-05-16 historical HOLD는 현재 재검증에서 재현되지 않음. 단독 fixture 후보이며 제품 default-on 완료 근거 아님 |
| `tracking-event-long` | `pass` | `True` | `candidate: no event delta or risk increase observed; still require more field samples` | 단독 fixture 후보. 반복/field sample 확인 필요 |
| `tracking-event-slow-long` | `pass` | `True` | `candidate: no event delta or risk increase observed; still require more field samples` | 이 fixture 단독 후보. 제품 default-on 완료 근거 아님 |
| `four-scene-control` | `pass` | `True` | `candidate: no event delta or risk increase observed; still require more field samples` | control sample도 이번 회차에서는 hold/warning 없음. 단독 완료 근거 아님 |
| `field-new-york-driving` | `warning` | `False` | `observe: association risk metric increased; keep guard default off` | vehicle-heavy field sample 성격상 별도 field/model review 필요 |

2026-05-16 재검증 후속에서는 `field-new-york-driving`을 `field-driving-live`
quality preset으로 분리했습니다. 이 preset은 high-volume vehicle counter의
observed risk jitter와 작은 hard risk jitter를 분리하기 위한 것이며,
event/scenario stable delta와 기본값 `off` 조건은 완화하지 않습니다.

분리 원칙:

- `defaultOnCandidate=True`는 fixture 단위의 후보 표시입니다.
- 하나 이상의 fixture가 후보여도 matrix에 `hold`나 `warning`이 남아 있으면
  V120-P2-02를 default-on 또는 안정 완료로 닫지 않습니다.
- `matrix-ok=True`여도 `judgement=warning` fixture가 있으면 제품 default-on 판단을
  진행하지 않습니다.
- 실제 제품 default-on은 여러 fixture와 현장 sample에서 event/scenario stable
  상태, hard risk non-increasing, observed risk 반복 안정성이 함께 확인된 뒤
  별도 review로만 결정합니다.
- close-object guard 기본값은 계속 `off`이고, guard 사용은 명시 opt-in입니다.
