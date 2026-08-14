# VLM Profile Storage

이 문서는 `v2.0.0 V200-S05 VLM profile 저장`의 세부 기준 문서입니다.
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
- server-canonical evaluation: 클라이언트가 제출한 candidate reference를 서버 catalog와
  검증한 뒤 생성한 `status`, case result, score/dimensions, provenance
- activation status: `pending-evaluation`, `active`, `disabled`, `fallback`
- fallback profile ID 또는 disabled reason
- S01 `runtimeContract`: `media-server.vlm-runtime-opt-in-contract.v1`,
  default-off, local/cloud/disabled/failure state, runtime/provider call 금지

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

v2.1.0 S01 이후 모든 profile은 `runtimeContract`를 포함해야 합니다.
`defaultEnabled=false`, `operatorOptInRequired=true`, `runtimeCallAllowed=false`,
`providerCallAllowed=false`, `sideEffects.*=false`가 아니면 저장하지 않습니다.
허용 상태는 `disabled`, `local-runtime`, `cloud-provider`, `missing-model`,
`invalid-output`, `timeout`입니다.

V390-ADD1-03 evaluation 저장 신뢰 경계:

- 저장 요청의 `evaluation`에는 `candidateId`, `expectedCatalogRevision`,
  `expectedProvenanceDigest`만 허용합니다.
- candidate가 없으면 세 값은 빈 문자열이어야 하고 서버가 `not-run`을 저장합니다.
- candidate가 있으면 서버가 catalog existence, revision/digest, `selectedOptionId`, model,
  prompt ID/version/language를 대조합니다.
- `status`, `source`, `caseIds`, `dimensions`, `score`, `provenance`를 클라이언트가 보내면
  거부합니다.
- 저장 문서의 evaluation과 `media-server.vlm-evaluation-provenance.v1`은 서버가
  canonical JSON으로 교체합니다.
- registry reload는 canonical evaluation/provenance를 같은 catalog로 다시 검증하고,
  불일치/과거 client-owned 문서는 `quarantinedProfileCount`로 계수해 조회에서 제외합니다.

활성화 조건:

- `enabled=true`는 서버가 판정한 evaluation status가 `passed`이고
  `activation.status=active`일 때만 허용합니다.
- `activation.status=disabled`는 `disabledReason`이 필요합니다.
- `activation.status=fallback`은 자기 자신이 아닌 `fallbackProfileId`가 필요합니다.

## Ops UI

`/ops/vlm`은 S04 dry-run 후보 표 아래에 S05 profile 저장 panel을 표시합니다.
운영자는 선택한 후보를 profile ID, prompt profile, read-only server evaluation,
activation, fallback/disable 상태와 함께 저장하고, 저장된 profile 목록에서 삭제할 수
있습니다. Evaluation select와 client-owned `passed` option은 없습니다.

이 UI의 저장 동작은 profile document만 쓰며, runtime 호출이나 provider 연결을
시작하지 않습니다. dry-run JSON details는 계속 S04 contract 확인용입니다.

## 검증

```bash
./server.sh verify-vlm-profile-storage
./server.sh verify-vlm-runtime-opt-in-contract
./server.sh verify-auth-routes
./server.sh verify-v390-vlm-promotion-trust-boundary
git diff --check
```

`verify-vlm-profile-storage`는 API/UI/schema/fixture/document wiring과 profile CRUD smoke 문서 연결을 확인합니다.
`verify-vlm-runtime-opt-in-contract`는 S01 runtime 상태 분리와 default-off invariant를
확인합니다.
`verify-auth-routes`는 unauth/viewer 차단, readonly operator read 허용, readonly
write 차단, admin CRUD, invalid profile fixture 거부를 실제 route smoke로 확인합니다.
`verify-v390-vlm-promotion-trust-boundary`는 auth-off throwaway registry에서 valid passed,
pending/non-passed/no-candidate와 forged passed, unknown/stale/mismatched candidate,
rejected update 보존을 실제 PUT/GET round-trip으로 확인합니다.

이 검증은 VLM 평가 harness, runtime 호출, sidecar 저장, 이벤트 설명 품질 평가,
장시간 안정화, UI 풀테스트 완료를 대신하지 않습니다.
