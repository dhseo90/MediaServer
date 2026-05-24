# Runtime Dashboard Longrun Evidence Template

schema: `media-server.runtime-dashboard-longrun-evidence-template.v1`
updated: 2026-05-20

이 문서는 Runtime Dashboard와 VA metadata side-channel 장시간 검증 결과를 RC 또는 고위험 media/VA fanout 변경에서
같은 형식으로 남기기 위한 evidence template입니다. 이 문서와 `verify-runtime-dashboard-longrun-template` 검증은
장시간 테스트를 실행하지 않습니다. 실제 longrun은 사용자가 명시하거나 RC gate에서 요구할 때만 실행합니다.

## 실행 대상

대표 명령:

```bash
./server.sh verify-va-runtime-console-longrun \
  --duration-minutes 120 \
  --clients 1 \
  --include-sidechannel \
  --include-dashboard \
  --include-rtsp \
  --idle-after-cleanup-minutes 30
```

### Runtime Console 120분 longrun 실행 기준

120분 Runtime Console longrun은 별도 실행 gate입니다. 아래 조건 중 하나가 있을 때만
실행합니다.

- release candidate에서 `run_va_runtime_120=true`로 RC gate를 연 경우
- 사용자가 `verify-va-runtime-console-longrun --duration-minutes 120` 실행을
  명시한 경우
- Runtime Console, SharedStream, VA metadata fanout, SSE/WS side-channel,
  RTSP/WebRTC media path, cleanup lifecycle, idle RSS 판정 로직을 바꾼 고위험 변경
- 30분 predev 또는 30분 Runtime Console longrun에서 active RSS high-water,
  cleanup count, metadata side-channel, dashboard polling에 release 판단 보류가
  남은 경우

다음 변경만 있을 때는 실행하지 않고, 테스트 결과 행을 만들지 않은 채 별도
`미실행`으로 남깁니다.

- 문서, checklist, verifier wording만 바꾼 경우
- UI/Auth/Ops 문구 또는 layout만 바꾸고 runtime fanout/media path를 건드리지 않은 경우
- sample-only fixture 또는 template만 갱신한 경우
- 사용자가 장시간 테스트 실행을 명시하지 않은 안정화 문서 정리

30분 longrun, cycle 검증, sample fixture는 120분 Runtime Console PASS evidence를
대체하지 않습니다. 실행하지 않은 경우에는
`Runtime Console 120분 longrun: 미실행 (사용자 명시 요청 없음 또는 해당 변경 범위 아님)`으로
별도 실행 상태에만 보고합니다.

cycle형 증거가 필요할 때:

```bash
./server.sh verify-va-runtime-console-cycles \
  --cycles 10 \
  --active-minutes 5 \
  --idle-minutes 2 \
  --clients 1 \
  --include-sidechannel \
  --include-dashboard \
  --include-rtsp
```

## Evidence Record

아래 블록을 release checklist, PR comment, 또는 verification history에 붙입니다.

```text
Runtime Dashboard Longrun Evidence

Run:
- date:
- operator:
- git commit:
- branch:
- build:
- OS / machine:
- command:
- execution trigger:
- not-run reason:
- duration minutes:
- token usage source:
- token start:
- token end:
- token consumed:
- elapsed:
- file/source:
- clients:
- include-dashboard:
- include-sidechannel:
- include-rtsp:
- idle-after-cleanup minutes:

Artifacts:
- summary JSON:
- markdown report:
- retention location:
- artifact retention days:
- server log:
- WebRTC client log:
- SSE side-channel log:
- RTSP overlay log:
- dashboard screenshot or screen recording:

Runtime Dashboard:
- dashboard polling count:
- active sessions max:
- active streams max:
- active analysis taps max:
- active SSE clients max:
- active WebSocket clients max:
- RTSP egress consumers max:
- latest runtime status timestamp:

Metadata:
- WebRTC DataChannel sent:
- WebRTC DataChannel dropped:
- WebRTC DataChannel failures:
- SSE metadata messages:
- WebSocket metadata messages:

Cleanup:
- cleanup ok:
- active sessions after cleanup:
- active analysis taps after cleanup:
- active SSE clients after cleanup:
- active WebSocket clients after cleanup:
- RTSP egress consumers after cleanup:
- ports clean:
- idle judgement:

RSS / CPU:
- RSS warmup policy:
- active RSS start / peak / end:
- idle RSS start / end / delta:
- CPU notes:

Judgement:
- test verdict:
- release review state:
- reason:
- follow-up:
```

## Sample Fixture

`test/fixtures/runtime_dashboard_longrun_evidence_sample/sample_record.json`과
`test/fixtures/runtime_dashboard_longrun_evidence_sample/sample_report.md`는 evidence record 형식만 검증하는 sample-only fixture입니다.
`sampleOnly=true`, `longrunExecuted=false`, `evidenceStatus=sample-only-not-executed` 상태이므로 실제 longrun PASS evidence로 쓰지 않습니다.

## 판정 기준

테스트 판정값은 `PASS`와 `FAIL`만 씁니다. `WARNING`, `HOLD`, `미실행`은 테스트
판정값이 아니라 release review state 또는 별도 실행 상태 기록입니다.

| 테스트 판정 | 기준 |
| --- | --- |
| PASS | summary/report가 존재하고 cleanup 후 active session/tap/SSE/WS/RTSP egress count가 0이며 `portsClean=true`입니다. DataChannel failure가 없고 idle judgement가 pass입니다. |
| FAIL | longrun 명령 실패, port cleanup failure, dashboard polling 중단, metadata side-channel 지속 실패, RTSP/WebRTC media path 회귀가 확인됩니다. |

| 별도 상태 | 기준 |
| --- | --- |
| WARNING | active 중 RSS가 증가했지만 cleanup 후 active count가 0이고 idle RSS가 유지/하락합니다. allocator high-water 또는 buffer pool retention 후보로 남깁니다. |
| HOLD | cleanup count가 0으로 정리되지 않거나 idle 중 active count가 다시 증가합니다. 원인 확인 전 release gate 통과로 보지 않습니다. |
| 미실행 | 실행 기준에 해당하지 않거나 사용자가 명시하지 않아 longrun을 실행하지 않은 상태입니다. sample fixture, 30분 longrun, cycle 검증을 120분 PASS evidence로 대체하지 않습니다. |

## 확인 항목

- Runtime Dashboard polling이 `/ops/api/runtime/status`를 장시간 유지하는지 확인합니다.
- Dashboard drill-down과 Runtime Debug polling이 media pipeline을 blocking하지 않는지 확인합니다.
- WebRTC DataChannel failure를 RTSP/WebRTC media path 실패로 단정하지 않고 side-channel evidence와 분리합니다.
- SSE/WS metadata schema, WebRTC DataChannel schema, Event POST payload schema는 변경하지 않습니다.
- viewer/client 화면에는 source URL, Developer URL, raw JSON, debug counter를 longrun evidence로 노출하지 않습니다.
- longrun summary JSON과 Markdown report 경로를 evidence record에 실제 파일 경로로 남깁니다.
- release 판단에 쓰는 120분 longrun report는 RC artifact 또는 외부 archive 보존 위치와 retention days를 함께 남깁니다.
- 실행하지 않은 longrun은 `미실행`으로 보고하고 PASS evidence로 쓰지 않습니다.

검증:

- `./server.sh verify-runtime-dashboard-longrun-template`
- `./server.sh verify-longrun-separation`
- `./server.sh verify-docs-links`
