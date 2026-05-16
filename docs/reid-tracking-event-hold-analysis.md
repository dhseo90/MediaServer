# Re-ID Tracking Event Hold Analysis

이 문서는 V120-P2-02 Re-ID/advanced tracking experiment의
`tracking-event` fixture HOLD 원인을 추적하기 위한 산출물입니다.

확인 기준:

- 기준일: 2026-05-16
- fixture: `tracking-event`
- 입력 파일: `imports/va_tracking_event_1280x720_30fps_h264.mp4`
- quality preset: `close-object-live`
- 재현 명령:

```bash
./server.sh compare-close-object-tracker --fixture-matrix --fixture-ids tracking-event --fail-on-missing-fixtures --fail-on-hold
```

재현 결과:

- matrix result: `matrix-ok=False`
- fixture judgement: `hold`
- recommendation: `hold: event/scenario output changed; keep guard opt-in`
- default-on candidate: `False`
- hold reason: `diagnosticVsOff event/scenario signature changed`

핵심 delta:

| 비교 | event/scenario stable delta | observed delta | 주요 관측 변화 |
| --- | --- | --- | --- |
| `diagnosticVsOff` | `eventScenarioDelta=true` | `eventScenarioObservedDelta=true` | `ptsRegressionCount +1`, `missedFrameSpikeCount +38`, `directionChangeSpikeCount +93`, `rejectedByCloseObjectGuardCount +235` |
| `enforceVsOff` | `eventScenarioDelta=false` | `eventScenarioObservedDelta=false` | `ptsRegressionCount +1`, `maxOverlapRisk +0.066499`, `missedFrameSpikeCount +33`, `directionChangeSpikeCount +214`, `closeObjectGuardAppliedCount +46`, `rejectedByCloseObjectGuardCount +220` |

판정:

- `diagnosticVsOff`에서 event/scenario stable signature가 바뀌었으므로
  default-on 검토를 중단합니다.
- `enforceVsOff`는 stable signature delta가 없더라도 observed risk와
  guard 적용/reject count 변화가 커서 default-on 후보로 사용하지 않습니다.
- 이 결과는 close-object guard를 계속 default-off/opt-in으로 유지해야 한다는
  근거입니다.

후속 확인:

- `tracking-event` HOLD는 threshold tuning만으로 완료 처리하지 않습니다.
- 같은 fixture의 반복 샘플, long fixture, slow-long fixture 결과를 분리해서
  비교합니다.
- Event POST/WebRTC DataChannel/SSE/WS metadata schema와 RTSP/WebRTC media
  path는 이 분석 범위에서 변경하지 않습니다.
