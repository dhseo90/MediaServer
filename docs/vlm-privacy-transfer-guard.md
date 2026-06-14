# VLM Privacy/Transfer Guard

이 문서는 `v2.0.0 V200-S11 Privacy/전송 guard`의 세부 guard 기준입니다.
S11은 cloud VLM 후보가 실제 provider 호출로 이어지기 전 외부 전송 경고, redaction,
provider logging/retention 검토를 강제하는 단계입니다. 실제 VLM runtime 호출,
cloud provider API 호출, sidecar 저장, Event POST/WebRTC/SSE/WS metadata schema 변경은
하지 않습니다.

## 직접 답

S11 guard schema는 `media-server.vlm-privacy-transfer-guard.v1`입니다. 이 guard는
`/ops/vlm` dry-run 후보와 저장되는 VLM profile의 `privacyGuard` field에만 존재합니다.
viewer/client 화면, EventRecord top-level field, Event POST payload, WebRTC DataChannel,
SSE/WS metadata에는 추가하지 않습니다.

Cloud profile은 아래 조건을 모두 만족해야 저장/활성화 후보가 됩니다.

- `privacyMode=cloud-allowed`
- `cloudOptInAcknowledged=true`
- `privacyGuard.externalTransferWarningAcknowledged=true`
- `privacyGuard.providerLoggingPolicy.reviewStatus=accepted`
- `privacyGuard.providerLoggingPolicy.loggingAndRetentionReviewed=true`
- `privacyGuard.providerLoggingPolicy.termsReviewed=true`
- credential, prompt, raw provider response, source URL, raw frame bytes, viewer/client
  exposure redaction flag가 모두 `false`

Local profile은 provider logging review가 `not-applicable`이어도 됩니다. 단, redaction
flag는 동일하게 모두 `false`여야 합니다.

## UI/API 경계

`/ops/vlm`은 `Privacy/전송 guard` panel을 표시합니다.

- Cloud 후보는 외부 전송 경고 확인과 provider logging/retention 검토 체크가 끝나기
  전까지 profile 저장 버튼이 비활성 상태입니다.
- Local 후보는 외부 provider 전송을 만들지 않으며 provider logging review가 적용되지
  않습니다.
- `dry-run JSON` details는 Ops debug details에만 있고 viewer/client에는 노출하지 않습니다.

`/ops/api/vlm/profiles` 저장 검증은 cloud profile에 `privacyGuard`가 없거나 provider
logging/retention review가 accepted가 아니면 거부합니다.

## Redaction Boundary

아래 값은 profile, sidecar, Ops review API, viewer/client, Event POST/WebRTC/SSE/WS
payload에 저장하거나 노출하지 않습니다.

- credential material
- raw prompt
- raw provider response
- source URL/source locator
- raw frame bytes
- provider policy 전문 또는 credential이 포함된 policy material

S11은 provider 정책의 현재 내용을 프로젝트 문서에 복제하지 않습니다. 운영자가 해당
provider의 현재 logging/retention/terms를 검토했다는 상태만 profile guard에 저장합니다.

## 운영 증적 경계

이 guard는 cloud provider 전송을 자동으로 허용하거나 provider 성공을 release PASS로
승격하지 않습니다. 관련 안정화 증적은 아래 경계를 함께 확인합니다.

- operator-approved profile promotion
- local/provider smoke intake
- privacy/default-off evidence
- no VLM default-on

PASS는 redacted Ops-only guard 증적입니다. 실제 cloud provider call, provider success,
provider credential 저장, model/runtime bundle, sidecar write, UI 풀테스트, 30분/120분
longrun 실행을 뜻하지 않습니다. Sidecar는 EventRecord/API schema에 섞지 않고,
Event POST/WebRTC DataChannel/SSE/WS metadata와 RTSP/WebRTC media path도 바꾸지
않습니다.

## Verification

```bash
./server.sh verify-vlm-privacy-transfer-guard
./server.sh verify-vlm-profile-storage
./server.sh verify-auth-routes
./server.sh verify-ops-client-ui
git diff --check
```

`verify-vlm-privacy-transfer-guard`는 fixture, `/ops/vlm` privacy panel, profile 저장
guard, docs/inventory/server wiring, viewer/client 비노출, Event POST/EventRecord storage
불변 조건을 정적으로 확인합니다.

이 검증은 실제 provider logging policy의 최신 내용 검토, 실제 cloud API 호출,
VLM runtime 호출, 장시간 안정화, UI 풀테스트 완료를 대신하지 않습니다.

v2.1.0 S03의 실제 cloud provider field smoke는 별도
`verify-vlm-cloud-provider-field-smoke-gate`가 관리합니다. Privacy/전송 guard PASS는
provider field smoke PASS가 아니며, S03 gate에서도 미실행/실패는 release PASS로
기록하지 않습니다.

## Non-Scope

S11에서 하지 않는 일:

- 실제 VLM runtime 호출
- cloud provider API 호출
- provider credential 저장
- raw prompt/raw response 저장
- sidecar 저장 정책 변경
- semantic event search 후보
- rule suggestion 후보
- Event POST/WebRTC/SSE/WS metadata schema 변경
- RTSP/WebRTC media path 변경
- viewer/client VLM 노출
