# Runtime Dashboard Longrun Evidence Sample

SAMPLE ONLY. This fixture validates the evidence template shape and is not proof that a longrun was executed.

```text
Runtime Dashboard Longrun Evidence

Run:
- date: 2026-05-16T00:00:00Z
- operator: sample-operator
- git commit: 0000000000000000000000000000000000000000
- branch: v1.2.0
- build: sample-build-id
- OS / machine: sample-macos-arm64
- command: ./server.sh verify-va-runtime-console-longrun --duration-minutes 120 --clients 1 --include-sidechannel --include-dashboard --include-rtsp --idle-after-cleanup-minutes 30
- duration minutes: 120
- file/source: sample_h264.mp4
- clients: 1
- include-dashboard: true
- include-sidechannel: true
- include-rtsp: true
- idle-after-cleanup minutes: 30

Artifacts:
- summary JSON: /tmp/media_server_va-runtime-longrun-<run-id>_summary.json
- markdown report: /tmp/media_server_va-runtime-longrun-<run-id>_report.md
- server log: /tmp/media_server_va-runtime-longrun-<run-id>_server.log
- WebRTC client log: /tmp/media_server_va-runtime-longrun-<run-id>_webrtc-client-1.log
- SSE side-channel log: /tmp/media_server_va-runtime-longrun-<run-id>_sse-sidechannel.log
- RTSP overlay log: /tmp/media_server_va-runtime-longrun-<run-id>_rtsp-overlay.log
- dashboard screenshot or screen recording: /tmp/media_server_va-runtime-longrun-<run-id>_dashboard.png

Runtime Dashboard:
- dashboard polling count: 720
- active sessions max: 1
- active streams max: 1
- active analysis taps max: 1
- active SSE clients max: 1
- active WebSocket clients max: 1
- RTSP egress consumers max: 1
- latest runtime status timestamp: 2026-05-16T02:00:00Z

Metadata:
- WebRTC DataChannel sent: 1200
- WebRTC DataChannel dropped: 0
- WebRTC DataChannel failures: 0
- SSE metadata messages: 1200
- WebSocket metadata messages: 1200

Cleanup:
- cleanup ok: true
- active sessions after cleanup: 0
- active analysis taps after cleanup: 0
- active SSE clients after cleanup: 0
- active WebSocket clients after cleanup: 0
- RTSP egress consumers after cleanup: 0
- ports clean: true
- idle judgement: pass

RSS / CPU:
- RSS warmup policy: ignore first 5 minutes
- active RSS start / peak / end: 315.2 / 344.8 / 332.1 MiB
- idle RSS start / end / delta: 332.4 / 331.8 / -0.6 MiB
- CPU notes: sample-only

Judgement:
- PASS / WARNING / HOLD / FAIL: PASS
- reason: sample-only example; cleanup counts are zero and idle judgement is pass
- follow-up: replace this fixture with actual summary/report paths after a real RC longrun
```

미실행: 이 sample fixture는 `verify-va-runtime-console-longrun`을 실행하지 않습니다.

주의: sampleOnly=true fixture는 PASS evidence로 쓰지 않습니다.
