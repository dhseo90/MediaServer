# Re-ID Fixture Default-on Candidates

이 문서는 V120-P2-02 Re-ID/advanced tracking experiment에서
close-object guard의 `defaultOnCandidate` 판정을 fixture별로 분리해 기록합니다.
전체 제품 default-on 결정 문서가 아닙니다.

확인 기준:

- 기준일: 2026-05-16
- 명령: `./server.sh verify-close-object-fixture-matrix`
- matrix result: `matrix-ok=False`
- 전체 판정: V120-P2-02는 `HOLD(실험 유지)`

Fixture별 판정:

| fixture | judgement | defaultOnCandidate | 권고 | 해석 |
| --- | --- | --- | --- | --- |
| `tracking-event` | `hold` | `False` | `hold: event/scenario output changed; keep guard opt-in` | event/scenario stable delta가 있어 default-on 검토 중단 |
| `tracking-event-long` | `warning` | `False` | `observe: live tracking counters changed; repeat and keep guard default off` | 반복 실행과 long sample 확인 필요 |
| `tracking-event-slow-long` | `pass` | `True` | `candidate: no event delta or risk increase observed; still require more field samples` | 이 fixture 단독 후보. 제품 default-on 완료 근거 아님 |
| `four-scene-control` | `warning` | `False` | `observe: live tracking counters changed; repeat and keep guard default off` | control sample에서도 observed 변동이 남음 |
| `field-new-york-driving` | `warning` | `False` | `observe: association risk metric increased; keep guard default off` | vehicle-heavy field sample 성격상 별도 field/model review 필요 |

분리 원칙:

- `defaultOnCandidate=True`는 fixture 단위의 후보 표시입니다.
- 하나의 fixture가 후보여도 matrix에 `hold`나 `warning`이 남아 있으면
  V120-P2-02를 default-on 또는 안정 완료로 닫지 않습니다.
- `matrix-ok=False`인 회차에서는 제품 default-on 판단을 진행하지 않습니다.
- 실제 제품 default-on은 여러 fixture와 현장 sample에서 event/scenario stable
  상태, hard risk non-increasing, observed risk 반복 안정성이 함께 확인된 뒤
  별도 review로만 결정합니다.
- close-object guard 기본값은 계속 `off`이고, guard 사용은 명시 opt-in입니다.
