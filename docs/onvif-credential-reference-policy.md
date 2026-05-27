# ONVIF Credential Reference Policy

이 문서는 v1.8.0 ONVIF field integration에서 도입한 credential reference 기준을
v1.9.0 release baseline에서도 유지되는 경계로 고정합니다. 현재 구현은 제품 persistent
credential 저장소가 아니라 live source 등록 draft, provider 기반 HTTP Basic 주입 경계,
fixture-grade in-memory store, redaction 검증을 제공하는 범위입니다.
credential 주입 설계 기준은
[ONVIF Auth Injection Design](./onvif-auth-injection-design.md)을 따릅니다.
저장소/secret manager 연동 설계 기준은
[ONVIF Credential Store Integration Design](./onvif-credential-store-integration-design.md)을
따릅니다.
v1.8.0 (2)에서 제품 persistent credential store를 후속 gate로 분리하는 결정은
`test/fixtures/onvif_credential_store_policy_decision.json`에 고정합니다.

## 현재 정책

- ONVIF credential 원문은 SourceRegistry, PublishedView, client/viewer API,
  field smoke artifact, 로그에 저장하거나 출력하지 않습니다.
- probe fixture의 `auth.credentialRef`는 실제 secret 값이 아니라 운영자가 별도로
  보관하는 reference가 존재한다는 합성 fixture 표현입니다.
- draft API 응답은 `auth.credentialRefPresent=true/false` 같은 boolean summary만
  반환합니다.
- `sourceDraft`, `publishedViewDraft`에는 credential field를 넣지 않습니다.
- endpoint URL에 username, password, token을 넣는 방식은 금지합니다.
- `verify-onvif-field-http-probe --credential-ref-present`는 reference 존재 여부만
  산출물에 남기며 인증 header나 secret을 주입하지 않습니다.
- `verify-onvif-auth-injection-loopback`은 기본 none provider에서는 reference-only
  request에 Authorization/Cookie/WS-Security secret material이 주입되지 않는지
  확인하고, in-memory fixture store provider 연결 시 HTTP Basic header가 요청에
  들어가되 실패 summary에는 username/password/reference가 남지 않는지 확인합니다.
- credential이 필요한 실제 장비가 HTTP 401/403을 반환하면 현재 단계에서는
  sanitized probe failure로 기록합니다.

## 운영 저장 비범위

아래 항목은 v1.8.0에서 분리했고 v1.8.0 기준 ONVIF live source draft 범위에도
포함하지 않습니다.

- 제품 persistent secret manager 연동
- 제품 credential 암호화 저장
- ONVIF WS-Security UsernameToken 생성
- HTTP Digest 인증 주입
- credential rotation, expiry, audit event
- SourceRegistry origin metadata 안의 credential binding

## 저장소 연동 설계

현재 단계에서는 제품 persistent secret 저장소를 구현 완료로 보지 않습니다. 향후
저장소를 추가할 때는 `CredentialSecretProvider`, `CredentialBindingStore`, probe
runtime, audit event의 경계를 분리하고, `credentialRef` 실제 값과 secret store key도
API/UI/artifact에 노출하지 않습니다.

코드 경계는 `include/ingress/onvif_credential_provider.h`의
`CredentialSecretProvider` interface, `NoneCredentialSecretProvider`,
`InMemoryCredentialSecretProvider`로 시작합니다. 기본 none provider는 secret lookup을 수행하지 않고
`credential_missing` 또는 `credential_provider_unavailable` 같은 sanitized status
code와 `secret_material_present=false`만 반환합니다. in-memory fixture store 또는
명시적으로 연결한 provider가
`credential_ready`와 `http_basic` material을 반환하면 probe adapter가 HTTP Basic
header를 생성합니다. `test/fixtures/onvif_auth_method_design_matrix.json`은 이
Basic provider 경계와 Digest/UsernameToken design-only 항목을 분리해 고정합니다.
`CredentialBindingStore`, 지속 secret material payload, Digest/UsernameToken 생성은
계속 향후 범위입니다.

Probe adapter summary 연결 정책:

- 현재 `RunOnvifProbeAdapter` summary에는 none provider status를 연결하지 않습니다.
- `OnvifProbeResult`는 `credential_ref_present`와 `plaintext_secret_included=false`만
  유지합니다.
- `credential_provider_unavailable`는 provider skeleton smoke와 향후 저장소 설계의
  status code이며, 현재 draft API/UI/artifact에 노출하지 않습니다.
- provider status를 API/UI/artifact에 노출하려면 별도 schema version, redaction
  matrix, failure wording 검증을 먼저 추가해야 합니다.
- 현재 `SendOnvifSoapHttp`는 전달받은 sanitized header만 전송하며, secret lookup이나
  WS-Security UsernameToken 생성은 수행하지 않습니다.

세부 기준은
[ONVIF Credential Store Integration Design](./onvif-credential-store-integration-design.md)에
고정합니다.

## 향후 구현 조건

credential reference 저장/주입을 추가할 때는 별도 단계에서 아래 조건을 만족해야
합니다.

- credential 원문은 libsodium 등 동급 암호화 또는 외부 secret manager에만 보관합니다.
- SourceRegistry와 PublishedView에는 secret 원문, token, password hash, reversible
  credential을 넣지 않습니다.
- API/UI 응답은 reference 존재 여부와 sanitized status만 노출합니다.
- Auth on에서는 `source:write` scope 없이는 credential reference 변경을 막습니다.
- field smoke artifact와 screenshot에는 reference 실제 값도 남기지 않습니다.
- 실패 문구는 `verify-onvif-probe-error-wording`과 같은 redaction matrix로
  고정합니다.

## 검증

```bash
./server.sh verify-onvif-auth-injection-design
./server.sh verify-onvif-auth-injection-loopback
./server.sh verify-onvif-credential-reference-policy
./server.sh verify-onvif-probe-fixture-contract
./server.sh verify-onvif-probe-draft-api
./server.sh verify-onvif-field-smoke-redaction
git diff --check
```
