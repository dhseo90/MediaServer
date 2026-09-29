# Ops VLM 상태 패널 읽기

운영자는 `/ops/vlm`의 `data-testid="ops-vlm-runtime-status-panel"`에서
선택 후보·저장 profile·서버 runtime 요약을 확인한다. Ops operator/admin과 `ops:read`가
필요하며 viewer/client에는 provider·prompt·raw response·source URL·내부 진단을 노출하지 않는다.

## 표시값의 출처와 한계

[product_ui_page_scripts.cpp](../src/ingress/product_ui_page_scripts.cpp)의
`opsVlmRuntimeStatusSummary/renderOpsVlmRuntimeStatus`가
`/ops/api/runtime/status`, `/ops/api/vlm/install-connection/dry-run`,
`/ops/api/vlm/profiles`의 상태를 조합한다.

| 표시 | 의미 |
| --- | --- |
| Provider | 선택 후보/profile의 provider 또는 cloud opt-in 승인 metadata |
| Runtime | local readiness와 runtimeContract 상태 또는 `provider field smoke only` |
| Last evaluation | 선택된 저장 profile의 `evaluation.status`; 실시간 모델 재평가 아님 |
| Failure | `disabled/missing-model/invalid-output/timeout` 또는 후보의 차단 사유 |
| Privacy | `local-only/cloud-disabled/cloud-allowed` |
| Default | `defaultEnabled=false/runtimeCallAllowed=false/providerCallAllowed=false` 계약과 상태 badge |
| runtime/status | 서버의 tap/session/egress 요약 또는 loading/error |

profile 선택은 active → fallback → 첫 저장 profile 순서다. 저장 profile이 없으면 선택 후보와
dry-run으로 비활성 runtimeContract를 만든다. 화면의 `local ready`는 readiness metadata이며,
실제 VLM HTTP 연결·모델 로드·추론 성공을 뜻하지 않는다.
`runtime/status ok`도 media server의 상태 조회 성공이지 모델 endpoint 성공이 아니다.
계약은 [runtime opt-in](vlm-runtime-opt-in-contract.md), 실제 loopback 검사는
[로컬 연결 smoke](vlm-local-runtime-connection-smoke.md), 외부 호출은
[cloud field gate](vlm-cloud-provider-field-smoke-gate.md)로 구분한다.

패널을 읽는 행위는 profile 저장·활성화·모델 설치/다운로드·runtime/provider 호출을 하지 않는다.
[평가 후보 선택](vlm-evaluation-result-workflow.md)과 profile 수동 저장은 별도 흐름이다.

## 검증 정의

```bash
./server.sh verify-vlm-runtime-status-ui
./server.sh verify-vlm-install-connection-ui
./server.sh verify-vlm-profile-storage
./server.sh verify-vlm-privacy-transfer-guard
./server.sh verify-auth-routes
./server.sh verify-ops-client-ui
```

UI-033의 첫 검사는 panel selector·source 조합·client 비노출·명령 연결을 읽는 정적 검사다.
이름에 UI가 있어도 브라우저를 직접 조작하지 않는다.
실제 확인에서는 local/cloud dry-run 변경, 저장 profile의 evaluation 반영, loading/error,
default-off 표시와 `/client/live`·`/client/dashboard` 비노출을 관측한다.
적격 증거·실행 승인은 [UI 풀테스트](manual-ui-fulltest.md)와
[검증 정책](stream-verification.md#검증-정책)을 따른다.

observation sidecar 쓰기, Event POST/WebRTC DataChannel/SSE/WS schema와 RTSP/WebRTC 경로는
변경하지 않는다. 정적 검사·API 응답·이 패널의 표시를 실제 모델 품질·외부 연결·장시간 성공으로
확대하지 않고 미실행 영역은 따로 기록한다.
