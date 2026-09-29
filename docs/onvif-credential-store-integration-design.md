# ONVIF 인증정보 저장소 연동 설계

현재 C++ credential provider와 향후 제품 영속 저장소의 경계를 설명합니다.
현재 제품은 `none` provider를 기본으로 사용하며, 검증용 in-memory provider와 명시적 HTTP Basic 주입 경계가 있습니다.
제품 credential 입력·binding CRUD·영속 secret 저장소·외부 secret manager는 구현하지 않았습니다.
운영자의 저장·공유·권한 기준은 [인증정보 참조 정책](./onvif-credential-reference-policy.md),
SOAP 요청의 동작은 [인증 주입 설계](./onvif-auth-injection-design.md)가 기준입니다.

## 현재 선택과 제외 이유

선택값은 [binding gate fixture](../test/fixtures/onvif_credential_binding_gate.json)의
`media-server.onvif-credential-binding-gate.v1`과
[저장소 정책 fixture](../test/fixtures/onvif_credential_store_policy_decision.json)의
`media-server.onvif-credential-store-policy-decision.v1`에 정의돼 있습니다.

- `primaryStoreProvider: none`: 제품 영속 저장소를 열지 않는 `defer-product-persistent-store` 결정입니다.
- `fallbackProviders: in-memory-fixture`: provider unit·no-device·loopback 검증용입니다.
  실행 중 장비 인증 실패에 따라 자동 선택하는 제품 fallback이 아닙니다.
- `local-encrypted 제외`: encryption key 수명, rotation, expiry와 audit 정책이 정해져야 하는 미구현 후보입니다.
- `external-secret-manager 제외`: provider credential, endpoint 정책, retry와 현장 증거에 대한
  명시적 운영 준비가 필요한 미구현 후보입니다.

| 기능·상태 | 현재 값 | 의미 |
| --- | --- | --- |
| `noneProvider` | true | 기본 provider는 secret material을 반환하지 않음 |
| `inMemoryFixtureProvider`, `httpBasicProviderBoundary` | true | 격리 검증용 저장·lookup과 명시 Basic 주입 |
| `credentialRefPresentSummary` | true | 공개 summary에는 reference 존재 여부만 표시 |
| `productPersistentSecretStoreEnabled` | false | 제품 영속 저장소 없음 |
| `externalSecretManagerEnabled` | false | 외부 manager adapter 없음 |
| `bindingStoreEnabled` | false | 제품 credential binding 저장·CRUD 없음 |
| `referenceValueExposed`, `secretMaterialStored` | false | gate/draft의 비노출·비저장 경계. 검증 provider가 메모리에 material을 보유하지 않는다는 뜻은 아님 |

SourceRegistry·PublishedView·client/viewer에 secret 원문·token·password hash·복호화 가능한 credential·
secret store key를 추가하지 않습니다. URL credential을 입력·import 수단으로 사용하지 않습니다.
`source:write`는 현행 import/pair-save와 향후 binding 변경의 권한 경계이며,
권한이 있다고 미구현 credential 저장 기능을 사용할 수 있는 것은 아닙니다.

### Fixture의 이유와 출처

두 정책 fixture는 제품 저장소를 열기 전에 남은 보안·운영 결정을 명시하기 위한 자료입니다.
`licenseProvenancePrivacy`는 운영자 소유 reference(`operator-owned-reference`)의 존재 여부만 다루고,
제3자의 credential material을 번들하거나 재배포하지 않으며,
fixture/운영자 입력을 제품 secret payload로 취급하지 않는 `reference-presence-only` 경계를 정합니다.

fixture의 `decidedFor`, `targetStep`, `notResidualForStep2`, `handoffIssue.phase`는 과거 결정의 식별자입니다.
그 값을 현재 완료 주장으로 바꾸지 않습니다. `handoffIssue.priority=P1`인 영속 저장소 후속 gate와
`realDeviceEndpointSuccess=미확인`은 남아 있습니다. 후보를 제외한 결정은 영구 지원 포기나 구현 완료가 아닙니다.

## 구현된 provider 인터페이스

[선언](../include/ingress/onvif_credential_provider.h)과
[구현](../src/ingress/onvif_credential_provider.cpp)이 현재 기준입니다.

| 구성 요소 | 구현된 역할 | 구현하지 않은 것 |
| --- | --- | --- |
| `CredentialSecretProvider` | `ProviderId()`, `Lookup(request) const` | 공통 put/delete/rotate 인터페이스 |
| `NoneCredentialSecretProvider` | secret 없는 lookup 결과 반환 | 파일·외부 manager 조회 |
| `InMemoryCredentialSecretProvider` | reference와 Basic material을 프로세스 메모리에 보관 | 암호화 영속 저장, 외부 adapter, 자동 rotation/expiry |
| `CredentialSecretMaterial` | `scheme`, `username`, `password`를 갖는 내부 C++ 값 | 공개 API payload나 영속 저장 형식 |
| `CredentialBindingStore` | 향후 origin/source와 opaque credential id를 연결할 설계 경계 | 현재 클래스·제품 API·저장 schema |

`InMemoryCredentialSecretProvider`만 `UpsertHttpBasic`, `MarkStatus`, `Erase`, `Size`를 제공합니다.
`UpsertHttpBasic`은 비어 있는 reference/username/password를 거부하고 유효 입력을 ready 상태로 저장합니다.
`MarkStatus`는 기존 record의 상태를 명시적으로 바꾸며 자동 만료 시계나 권한 판정이 아닙니다.
상태 변경이 보관 중 material을 지우는 것도 아닙니다. `Erase`는 record 제거이며 안전한 메모리 소거를 보장하는 API가 아닙니다.
따라서 이 구현을 운영 영속 secret store나 완성된 rotation/expiry workflow로 사용하지 않습니다.

### 내부 lookup 결과

`CredentialLookupStatusCode`가 아래 식별자를 반환합니다.
현재 API의 provider 준비 상태 요약과 달리, 이 결과는 개별 내부 lookup의 상태입니다.

| 상태 코드 | 현재 발생 조건 | material 반환 |
| --- | --- | --- |
| `credential_not_requested` | `CredentialLookupResult`의 기본 상태 | 없음 |
| `credential_missing` | None에서 reference 미표시; in-memory에서 미표시·빈 key·record 없음 | 없음 |
| `credential_provider_unavailable` | None에서 reference가 있다고 표시됨 | 없음. 현재 외부 provider timeout 감시 결과는 아님 |
| `credential_denied` | in-memory record에 해당 상태를 명시 설정 | 없음. 현재 scope 검사 자체의 결과는 아님 |
| `credential_expired` | in-memory record에 해당 상태를 명시 설정 | 없음. 자동 expiry 구현은 아님 |
| `credential_material_rejected` | ready record의 scheme이 Basic이 아니거나 username/password가 비어 있음; 해당 상태 명시 설정도 가능 | 없음 |
| `credential_ready` | ready record가 `http_basic`과 비어 있지 않은 username/password를 제공 | `secret_material_present=true`와 내부 material |

non-ready lookup은 `secret_material_present=false`이며 material을 결과로 복사하지 않습니다.
None provider도 probe 요청 자체를 중단시키지는 않습니다. 인증값 없이 유효한 응답을 받을 수 있으므로,
probe 성공과 credential 인증 성공은 구분합니다.

## 공개 상태 조회와 비노출 경계

`GET /ops/api/onvif/credential-provider-status`는 이미 구현된 Ops 읽기 전용 API입니다.
`media-server.ops.v390-onvif-credential-provider-status.v1`의
`sanitizedCredentialProviderStatusSummary`를 반환하며 현재 선택·제외 이유와 비저장 경계를 보여줍니다.
`credentialLookupPerformed=false`, `statusSummaryOnly=true`이므로 위 lookup 상태를 읽거나 secret store에 접속하지 않습니다.
권한·필드·UI 표시는 [인증정보 참조 정책](./onvif-credential-reference-policy.md#provider-status는-lookup-결과가-아님)에 모았습니다.

현재 `RunOnvifProbeAdapter` summary는 `credentialRefPresent`에 대응하는 존재 여부만 유지하고
lookup 상태·reference 값·material을 추가하지 않습니다.
향후 개별 provider lookup 상태를 probe/draft 응답에 연결하려면 schema version·호환성 검토와
redaction matrix 확장이 필요합니다. 허용할 상태 코드와 공개 범위를 정의하되
reference 값·provider path·secret material을 SourceRegistry/PublishedView/API/UI/산출물에 넣지 않습니다.

## 영속 저장소를 추가하기 전의 조건

아래는 아직 구현하지 않은 제품 저장소의 설계 조건입니다. 현재 API 설명으로 해석하지 않습니다.

| 향후 경계 | 필요한 역할·안전 조건 |
| --- | --- |
| Secret store adapter | libsodium 등 동급 암호화 저장소 또는 외부 secret manager 선택, key 수명·접근 권한·장애 정책 정의. secret·provider token·certificate dump 비노출 |
| Binding store | ONVIF origin/source와 opaque credential id 연결. secret·URL credential·복호화 가능한 credential은 binding에 넣지 않음 |
| Probe runtime | binding으로 조회한 material을 승인된 인증 방식에만 사용하고 header/SOAP 원문을 출력하지 않음 |
| Audit | 생성·변경·삭제·rotation 결과의 내부 reference id와 정제 상태만 기록. 공개 응답에서는 실제 reference도 비노출 |

1. provider status 공개·binding 저장 schema와 기존 source/view 계약의 호환성을 검토합니다.
2. credential reference 생성·교체·삭제에 `source:write` guard를 적용합니다.
3. 암호화 local store 또는 external manager를 선택하고 key·provider credential·endpoint·retry 정책을 정의합니다.
4. rotation은 새 secret 저장 → binding 교체 순서로 설계합니다. 이전 secret 삭제 실패는
   secret 없이 별도 audit event로 남깁니다. expiry와 audit payload도 별도로 정의해야 합니다.
5. auth header와 SOAP security header를 redaction matrix에 포함합니다. 실패 요약에는
   endpoint·host·username·password·token·realm·nonce·provider path·header 원문을 남기지 않습니다.
6. 실장비 credential smoke의 정제된 artifact를 확보합니다. 실행·외부 credential 사용 승인은
   [검증 정책](./stream-verification.md#검증-정책)을 따릅니다.

제품 binding UI/API, rotation/expiry/audit workflow, HTTP Digest와 WS-Security 자동 fallback은
별도 미구현 항목입니다. 인증 방식별 조건은 [인증 주입 설계](./onvif-auth-injection-design.md)에 둡니다.
현재 상태 요약이나 합성 fixture는 위 조건 충족·실장비 성공·영속 저장소 완료의 증거가 아닙니다.

## 검증 정의

```bash
./server.sh verify-v260-onvif-credential-gate
./server.sh verify-onvif-credential-reference-policy
./server.sh verify-onvif-auth-injection-design
./server.sh verify-onvif-auth-injection-loopback
./server.sh verify-onvif-protocol-support-matrix
```

첫 명령은 binding gate fixture·선택 이유·scope·비노출 계약의 정적 검사입니다.
credential reference 검사는 source/fixture와 C++ provider unit을 확인하고, auth loopback은 격리된 로컬 요청을 확인합니다.
이는 문서의 실행 정의이며 이번 실행 결과가 아닙니다.
명령별 환경·산출물·cleanup은 [무장비 검증](./onvif-no-device-verification.md),
전체 지원 범위는 [프로토콜 지원표](./onvif-protocol-support-matrix.md)를 참조합니다.
