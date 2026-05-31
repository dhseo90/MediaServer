# VLM Profile Storage

이 문서는 `v2.0.0 V200-S05 VLM profile 저장`의 source-of-truth입니다.
S05는 S04 dry-run에서 운영자가 선택한 후보를 저장 가능한 profile로 고정하되,
VLM runtime 호출, cloud provider API 호출, VLMObservation sidecar 저장은 하지 않습니다.

## 직접 답

저장 schema는 `media-server.vlm-profile.v1`입니다. 저장 위치는 기존
analysis registry 파일의 `vlmProfiles` 필드이며, 제품 route는 Ops 전용
`/ops/api/vlm/profiles`입니다.

저장하는 항목:

- provider: `user-supplied-local-runtime` 또는 `cloud-provider-api`
- model: S01/S03/S04에서 허용한 Qwen local 후보 또는 `gemini-2.5-flash`
- runtime: `ollama`, `vllm`, `provider-api`, `not-configured`
- prompt profile: raw prompt가 아니라 `promptProfile.id/version/language`
- privacy mode와 cloud opt-in acknowledgement
- S11 `privacyGuard`: 외부 전송 경고 확인, redaction flag, provider logging/retention
  review 상태
- evaluation status: `not-run`, `passed`, `failed`, `review-required`
- activation status: `pending-evaluation`, `active`, `disabled`, `fallback`
- fallback profile ID 또는 disabled reason

저장하지 않는 항목:

- raw prompt, raw response
- provider credential, API key, token
- source URL, source locator
- image/frame bytes
- VLMObservation sidecar
- Event POST/WebRTC/SSE/WS metadata 변경 field

## API

```bash
GET    /ops/api/vlm/profiles
POST   /ops/api/vlm/profiles
GET    /ops/api/vlm/profiles/{id}
PUT    /ops/api/vlm/profiles/{id}
DELETE /ops/api/vlm/profiles/{id}
```

읽기는 admin/operator `ops:read` 권한이 필요합니다. 생성, 수정, 삭제는
`ops:read`와 `rule:write`가 모두 필요합니다. viewer/client route에는 VLM profile
API를 만들지 않습니다.

Cloud profile은 `provider=cloud-provider-api`, `model=gemini-2.5-flash`,
`runtime=provider-api`, `privacyMode=cloud-allowed`,
`cloudOptInAcknowledged=true`가 모두 맞아야 저장됩니다. S11 이후 cloud profile은
`privacyGuard` 안의 외부 전송 경고 확인과 provider logging/retention/terms accepted
review도 필요합니다.

활성화 조건:

- `enabled=true`는 `evaluation.status=passed`와 `activation.status=active`일 때만 허용합니다.
- `activation.status=disabled`는 `disabledReason`이 필요합니다.
- `activation.status=fallback`은 자기 자신이 아닌 `fallbackProfileId`가 필요합니다.

## Ops UI

`/ops/vlm`은 S04 dry-run 후보 표 아래에 S05 profile 저장 panel을 표시합니다.
운영자는 선택한 후보를 profile ID, prompt profile, evaluation, activation,
fallback/disable 상태와 함께 저장하고, 저장된 profile 목록에서 삭제할 수 있습니다.

이 UI의 저장 동작은 profile document만 쓰며, runtime 호출이나 provider 연결을
시작하지 않습니다. dry-run JSON details는 계속 S04 contract 확인용입니다.

## 검증

```bash
./server.sh verify-vlm-profile-storage
./server.sh verify-auth-routes
git diff --check
```

`verify-vlm-profile-storage`는 API/UI/schema/fixture/document wiring을 확인합니다.
`verify-auth-routes`는 unauth/viewer 차단, readonly operator read 허용, readonly
write 차단, admin CRUD, invalid profile fixture 거부를 실제 route smoke로 확인합니다.

이 검증은 VLM 평가 harness, runtime 호출, sidecar 저장, 이벤트 설명 품질 평가,
장시간 안정화, UI 풀테스트 완료를 대신하지 않습니다.
