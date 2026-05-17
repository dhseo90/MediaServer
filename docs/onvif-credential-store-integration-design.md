# ONVIF Credential Store Integration Design

이 문서는 ONVIF credential reference를 저장소 또는 외부 secret manager와 연동할
때의 설계 기준을 고정합니다. v1.2.0에서 도입되어 현재 유지되는 구현은 제품 API/UI에 persistent secret
저장소를 열지 않지만, provider 경계 검증용 in-memory credential store를 통해
`credentialRef` lookup, HTTP Basic material 반환, redaction 검증을 수행합니다.

관련 기준:

- [ONVIF Credential Reference Policy](./onvif-credential-reference-policy.md)
- [ONVIF Auth Injection Design](./onvif-auth-injection-design.md)
- [ONVIF Protocol Support Matrix](./onvif-protocol-support-matrix.md)

정책 결정 fixture:

- `test/fixtures/onvif_credential_store_policy_decision.json`

## 현재 상태

- 제품 API와 UI는 ONVIF credential 원문 입력, 저장, 조회를 제공하지 않습니다.
- `credentialRef`는 fixture 안에서 reference 존재 여부를 표현하는 합성 값입니다.
- `InMemoryCredentialSecretProvider`는 no-device/loopback 검증용 fixture store입니다.
  제품 persistent store나 외부 secret manager 구현 완료를 의미하지 않습니다.
- SourceRegistry와 PublishedView에는 secret 원문, token, password hash, reversible
  credential, secret store key를 넣지 않습니다.
- field smoke artifact와 draft API 응답은 `credentialRefPresent=true/false`만
  노출합니다.

## v1.2.0 (2) 정책 결정

이번 ONVIF 현장 연동 스텝에서는 제품 persistent credential store를 구현 완료로
열지 않습니다. 결정값은
`test/fixtures/onvif_credential_store_policy_decision.json`에 고정합니다.

- 결정: `defer-product-persistent-store`
- 현재 범위: none provider, no-device in-memory fixture provider, HTTP Basic provider
  boundary, `credentialRefPresent` boolean summary
- 이번 스텝 잔여로 보지 않는 항목: local encrypted credential store, external secret
  manager adapter, credential binding UI/API, rotation/expiry/audit workflow,
  Digest/WS-Security automatic fallback
- 후속으로 열기 전 필수 gate: schema review, `source:write` guard, encrypted store 또는
  external secret manager 선택, rotation/expiry/audit 정책, auth header/SOAP security
  header redaction matrix, 실장비 credential smoke redacted artifact

## 저장소 경계

향후 저장소를 추가할 때는 아래 경계를 분리합니다.

| 경계 | 역할 | 노출 금지 |
| --- | --- | --- |
| CredentialSecretProvider | secret put/get/delete/rotate를 수행하는 provider adapter | secret 원문, provider token, certificate dump |
| CredentialBindingStore | ONVIF origin 또는 source draft와 opaque credential id를 연결 | secret 원문, URL credential, reversible credential |
| Probe runtime | credential id로 secret을 조회해 인증 header/SOAP security header 생성 | log, API response, artifact 안의 secret/header 원문 |
| Audit event | 생성/수정/삭제/회전 결과를 기록 | username, password, nonce, token, realm 원문 |

provider 후보:

- `none`: 현재 상태입니다. secret lookup을 수행하지 않고 인증 필요 장비는 sanitized
  failure로 남깁니다.
- `local-encrypted`: libsodium 등 동급 암호화 저장소를 쓰는 향후 옵션입니다.
- `external-secret-manager`: 운영 환경의 secret manager adapter를 쓰는 향후 옵션입니다.

현재 코드 skeleton:

- `CredentialSecretProvider`: `include/ingress/onvif_credential_provider.h`에 선언한
  provider interface입니다.
- `NoneCredentialSecretProvider`: secret lookup을 수행하지 않는 현재 provider입니다.
- `InMemoryCredentialSecretProvider`: fixture scope에서 `credentialRef`와 HTTP Basic
  material을 저장하고 `credential_ready`, `credential_missing`, `credential_denied`,
  `credential_expired` 같은 sanitized status를 반환하는 store-backed provider입니다.
- `CredentialLookupStatusCode`: `credential_missing`,
  `credential_provider_unavailable`, `credential_denied`, `credential_expired`,
  `credential_material_rejected` 같은 sanitized status code만 반환합니다.
- `secret_material_present=false`: none/missing/denied/expired/rejected lookup에서는
  probe runtime에도 secret material을 반환하지 않습니다.
- `secret_material_present=true`: 명시 저장된 `http_basic` material이 있을 때 probe
  runtime에만 반환하며 API/UI/artifact에는 출력하지 않습니다.
- `CredentialBindingStore`와 secret material payload는 아직 설계 전용입니다.

Probe adapter summary 연결 정책:

- 현재는 `NoneCredentialSecretProvider` 상태를 `RunOnvifProbeAdapter` summary에
  연결하지 않습니다.
- provider lookup 결과는 provider smoke와 auth injection loopback smoke에서 검증하고,
  probe adapter는 기존 `credentialRefPresent` boolean summary만 유지합니다.
- 향후 provider status를 연결할 때도 `credential_provider_unavailable` 같은 sanitized
  status code만 허용하며, reference 값, provider path, secret material은
  SourceRegistry/PublishedView/API/UI/artifact에 넣지 않습니다.
- provider status를 노출하는 단계는 기존 probe/draft summary schema version 변경과
  redaction matrix 확장을 동반해야 합니다.

## Reference 규칙

- `credentialRef`는 lookup key일 뿐이며 secret 값으로 해석하지 않습니다.
- API/UI 응답에는 실제 reference 값도 기본 노출하지 않고, 존재 여부와 sanitized
  status만 노출합니다.
- endpoint URL의 username/password/token은 저장소 입력으로도 받지 않습니다.
- `source:write` scope 없이는 credential reference 생성, 교체, 삭제를 허용하지
  않습니다.
- rotation은 새 secret을 저장한 뒤 binding을 교체하고, 이전 secret 삭제 실패는
  별도 sanitized audit event로 남깁니다.

## 실패 문구

저장소 연동 실패는 아래처럼 분류하되 secret과 reference 원문은 남기지 않습니다.

- `credential_missing`: credential reference가 없거나 binding을 찾을 수 없음
- `credential_denied`: scope 또는 provider access가 거부됨
- `credential_expired`: provider가 만료 상태를 반환함
- `credential_provider_unavailable`: provider timeout 또는 일시 장애
- `credential_material_rejected`: secret 형식이 인증 방식 요구사항을 만족하지 않음

모든 실패 문구는 endpoint, host, username, password, token, realm, nonce, SOAP
security header, provider path를 포함하지 않아야 합니다.

## 비범위

- 현재 단계에서 제품 persistent secret 저장소 구현 완료 선언
- client/viewer API에 credential reference 노출
- SourceRegistry/PublishedView에 secret store key 저장
- URL credential import
- passwordless ONVIF probe 성공 처리
- raw auth header 또는 raw SOAP security header artifact 저장

## 검증

```bash
./server.sh verify-onvif-credential-reference-policy
./server.sh verify-onvif-auth-injection-design
./server.sh verify-onvif-auth-injection-loopback
./server.sh verify-onvif-protocol-support-matrix
git diff --check
```
