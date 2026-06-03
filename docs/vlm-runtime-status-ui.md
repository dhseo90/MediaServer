# VLM Runtime Status UI

이 문서는 `v2.1.0 V210-S05 Ops VLM runtime status UI`의 source-of-truth입니다.
S05는 `/ops/vlm`에서 provider 상태, runtime 연결 상태, 마지막 evaluation, 실패 사유,
privacy mode, default-off 상태를 운영자가 확인할 수 있게 합니다.

## 직접 답

`/ops/vlm`에는 `data-testid="ops-vlm-runtime-status-panel"` 패널이 있습니다. 이
패널은 기존 `/ops/api/runtime/status`, `/ops/api/vlm/install-connection/dry-run`,
`/ops/api/vlm/profiles` 상태를 조합해 read-only로 표시합니다. 새 Event POST,
WebRTC DataChannel, SSE/WS metadata payload field는 추가하지 않습니다.

표시 항목:

- Provider: local runtime 후보인지 cloud opt-in/field-smoke 후보인지 표시
- Runtime: local runtime readiness 또는 provider field-smoke-only 상태 표시
- Last evaluation: 저장 profile의 `evaluation.status` 표시
- Failure: `disabled`, `missing-model`, `invalid-output`, `timeout` 같은 VLM-only 실패 사유 표시
- Privacy: local-only, cloud-disabled, cloud-allowed 상태 표시
- Default: `defaultEnabled=false`, `runtimeCallAllowed=false`, `providerCallAllowed=false` 상태 표시

## 검증

```bash
./server.sh verify-vlm-runtime-status-ui
./server.sh verify-vlm-install-connection-ui
./server.sh verify-vlm-profile-storage
./server.sh verify-vlm-privacy-transfer-guard
./server.sh verify-auth-routes
./server.sh verify-ops-client-ui
git diff --check
```

직접 UI evidence는 인앱 브라우저에서 `/ops/vlm`을 열고 runtime status panel,
local/cloud dry-run 상태 변경, 저장 profile이 있을 때 Last evaluation을 반영하는
렌더링 경계, `/client/live` 비노출을 확인한 기록으로 분리합니다.
`verify-ops-client-ui`나 raw JSON/API 확인만으로 제품 UI 직접 확인 PASS를 대체하지
않습니다.

## 비범위

- 실제 VLM runtime/provider 호출
- provider credential 저장
- model/runtime bundle 또는 download
- VLMObservation sidecar write
- Event POST/WebRTC/SSE/WS payload/schema 변경
- RTSP/WebRTC media path 변경
- client/viewer 화면에 provider, prompt, raw response, source URL, 내부 runtime 진단 표시

## 완료/미실행 구분

완료로 볼 수 있는 것은 runtime status panel 구현, S05 verifier와 Ops UI smoke PASS,
auth/scope route guard PASS, viewer/client redaction 확인, 그리고 인앱 브라우저 직접
확인 evidence입니다. 30분 soak, 120분 longrun, cloud provider field smoke는 S05 UI
패널 완료 evidence가 아니며, 실행하지 않으면 미실행으로 기록합니다.
