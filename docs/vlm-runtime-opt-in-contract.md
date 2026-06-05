# VLM Runtime Opt-in Contract

이 문서는 `v2.1.0 V210-S01 VLM runtime opt-in contract`의 source-of-truth입니다.
S01은 실제 VLM runtime/provider를 호출하지 않고, 운영자가 명시적으로 켜기 전까지
모든 profile이 default-off임을 저장 계약으로 고정합니다.

## 직접 답

사용하기로 한 runtime 상태 contract는 `media-server.vlm-runtime-opt-in-contract.v1`
입니다. 이 객체는 `media-server.vlm-profile.v1` profile 안의 `runtimeContract`에
저장합니다.

상태 목록:

- `disabled`: 기본 상태. runtime/provider 호출 불가, activation enabled 불가.
- `local-runtime`: 운영자 제공 local runtime 후보. S01에서는 호출 권한이 아니라
  opt-in metadata입니다.
- `cloud-provider`: cloud provider 후보. privacy guard와 cloud opt-in은 저장되지만
  실제 provider field smoke는 별도 단계입니다.
- `missing-model`: local runtime/model 준비 부족. media path 실패가 아닙니다.
- `invalid-output`: structured output 거부 상태. sidecar/EventRecord를 쓰지 않습니다.
- `timeout`: runtime/provider timeout 상태. Event POST/WebRTC/SSE/WS/media path 실패로
  전파하지 않습니다.

1차 선택값:

- 기본값은 `disabled`이며 `defaultEnabled=false`입니다.
- local 후보의 fallback은 `missing-model`입니다.
- cloud 후보의 fallback은 `cloud-provider` 상태 + `providerFieldSmokeRequired=true`
  또는 field smoke 미실행 기록입니다.
- invalid output과 timeout은 VLM-only failure state로 남기고 기존 Event POST,
  WebRTC DataChannel, SSE/WS metadata, RTSP/WebRTC media path를 바꾸지 않습니다.

제외 대상:

- VLM runtime 호출, cloud provider API 호출, model artifact download/bundle
- provider credential 저장
- VLMObservation sidecar write
- Event POST/WebRTC/SSE/WS payload 변경
- client/viewer 노출

## v2.3.0 VLM opt-in operational evidence

`media-server.v230-vlm-opt-in-operational-evidence.v1` gate는 이 default-off
runtime contract를 v2.3.0 S05 운영 증적의 첫 단계로 사용합니다. S05의 직접 답은
VLM default-on이 아니라 `operator-approved profile promotion`, `local/provider smoke
intake`, `privacy/default-off evidence`를 같은 안정화 evidence 묶음으로 연결하는
것입니다.

S05에서 `verify-v230-vlm-opt-in-operational-evidence`는 `defaultEnabled=false`,
`runtimeCallAllowed=false`, `providerCallAllowed=false`를 다시 확인합니다. 이 PASS는
`no VLM default-on` 증적이며, 실제 VLM runtime call, cloud provider success,
provider credential 저장, model/runtime bundle, sidecar write, UI 풀테스트, 30분/120분
longrun 실행을 뜻하지 않습니다. Sidecar is not mixed into EventRecord/API schema, and
Event POST/WebRTC DataChannel/SSE/WS metadata와 RTSP/WebRTC media path도 변경하지
않습니다.

S05 evidence keywords: operator-approved profile promotion; local/provider smoke intake; privacy/default-off evidence; no VLM default-on. Sidecar is not mixed into EventRecord/API schema.

## Profile 저장 규칙

`runtimeContract` 필수 field:

- `schema`: `media-server.vlm-runtime-opt-in-contract.v1`
- `targetStep`: `V210-S01`
- `mode`: `disabled`, `local-runtime`, `cloud-provider`
- `status`: `disabled`, `local-runtime`, `cloud-provider`, `missing-model`,
  `invalid-output`, `timeout`
- `defaultEnabled=false`
- `operatorOptInRequired=true`
- `runtimeCallAllowed=false`
- `providerCallAllowed=false`
- `sideEffects.*=false`

Cloud profile은 기존 `privacyGuard`의 external transfer acknowledgement와 provider
logging/retention/terms accepted review를 계속 요구합니다. S01의 `cloud-provider`
상태는 실제 provider 성공 evidence가 아닙니다.

## 검증

```bash
./server.sh verify-vlm-runtime-opt-in-contract
./server.sh verify-vlm-profile-storage
./server.sh verify-vlm-privacy-transfer-guard
./server.sh verify-auth-routes
git diff --check
```

이 검증은 local VLM runtime smoke, cloud provider field smoke, 30분 soak,
120분 longrun, UI 풀테스트를 대신하지 않습니다.
