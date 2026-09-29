# ONVIF 인증정보 참조 정책

운영자·개발자가 ONVIF credential과 reference를 다룰 때의 저장·권한·비노출 기준입니다.
현재는 기본 None provider, 명시적 provider의 HTTP Basic 주입, 검증용 in-memory store와
정제된 Ops 상태 조회를 제공합니다. 제품의 영속 secret 저장소나 credential 입력·변경 API는 제공하지 않습니다.
주입 과정은 [인증 주입 설계](./onvif-auth-injection-design.md), provider와 미구현 저장소의 경계·선택 이유는
[저장소 연동 설계](./onvif-credential-store-integration-design.md)가 기준입니다.

## 참조와 비밀의 구분

| 위치 | 현재 의미 | 공개 경계 |
| --- | --- | --- |
| 합성 probe/import fixture의 `auth.credentialRef` | secret이 아닌 합성 reference 값 | draft가 존재 여부만 요약. 실제 reference로 바꿔 Git에 넣지 않음 |
| C++ `CredentialLookupRequest.credential_ref` | 명시 provider의 lookup key | 내부 입력이며 API/UI의 공개 credential 필드가 아님 |
| draft의 `auth.credentialRefPresent` | reference 존재 여부 boolean | 실제 값·secret·인증 성공을 반환하지 않음 |
| `OnvifProbeResult` | `credential_ref_present`, `plaintext_secret_included=false` | 개별 provider lookup status나 secret material을 결과 모델에 복사하지 않음 |
| Ops provider status | 저장소 선택·준비 상태·redaction 요약 | 실제 lookup·장비 인증·binding 변경을 수행하지 않음 |

`credentialRefPresent=true`는 credential이 유효하거나 장비 인증이 성공했다는 뜻이 아닙니다.
`verify-onvif-field-http-probe --credential-ref-present`도 boolean 표시만 남기며 secret을 공급하거나 인증 header를 주입하지 않습니다.
실제 lookup의 `credential_missing`, `credential_provider_unavailable` 등은
[provider 내부 상태](./onvif-credential-store-integration-design.md)의 계약입니다.

## 저장·입력·공유 금지선

- credential 원문, username/password/token, auth header와 SOAP security header를
  SourceRegistry, PublishedView, client/viewer API, 로그, screenshot, field artifact에 저장·노출하지 않습니다.
- `sourceDraft`, `publishedViewDraft`에 secret·reference 값·secret store key·password hash·복호화 가능한 credential을 넣지 않습니다.
  ONVIF origin metadata의 credential binding도 현재 저장 schema에 없습니다.
- endpoint URL이나 stream URI에 인증값을 넣는 URL credential 방식은 금지합니다.
  현재 draft·채널 폼은 URI authority의 credential을 거부합니다. 이것이 모든 임의 JSON 필드나 query의
  민감값을 자동 탐지·정제한다는 보장은 아니므로 이름·tag·query에도 비밀을 넣지 않습니다.
- probe/import fixture는 합성 자료만 사용합니다. `auth.plaintextSecretIncluded=true`는 draft API가 거부하며,
  이 표시를 false로 두면 실제 secret을 넣어도 된다는 뜻이 아닙니다.
- Ops용 `sourceDraft.rtspUrl`에는 선택 URI가 들어갑니다. source locator가 없는 PublishedView/client 응답과
  혼동하지 말고 draft 응답을 공유 산출물로 그대로 복사하지 않습니다.

등록·쌍 저장·Client 비노출의 전체 계약은 [라이브 소스 안내](./onvif-live-source-support.md),
공유 전 점검은 [현장 산출물 redaction 기준](./onvif-field-smoke-artifact-redaction.md)을 따릅니다.

## 현재 Ops API와 권한

| 경로 | 동작 | 권한·부작용 |
| --- | --- | --- |
| `POST /ops/api/onvif/import-draft` | fixture를 미저장 draft와 `credentialGate`로 변환 | Ops 접근 + `source:write`; secret lookup·SourceRegistry/PublishedView 저장 없음 |
| `PUT /ops/api/onvif/channels/{channelId}` | 운영자가 확인한 source/view 쌍 저장 | Ops 접근 + `source:write`; credential 저장 API는 아님 |
| `GET /ops/api/onvif/credential-provider-status` | 정제된 provider 준비 상태 요약 | Ops 읽기 전용; `source:write` 불필요, secret lookup·쓰기 없음 |
| `GET /ops/api/onvif/live-import-persist-decision` | draft 적용 후 명시 저장 절차 안내 | Ops 읽기 전용; 이 조회 자체는 저장하지 않음 |

Ops 접근은 기능 활성화·인증과 operator role + `ops:read`를 요구하며 admin은 기존 권한 helper의 우회 규칙을 따릅니다.
Client/viewer에 관리 API나 credential 입력 UI를 제공하지 않습니다.
향후 credential reference 생성·교체·삭제를 추가할 때도 `source:write` guard를 먼저 정의해야 하며,
현재 그런 binding CRUD가 존재한다고 해석하지 않습니다.

### Provider status는 lookup 결과가 아님

`OpsV390OnvifCredentialProviderStatusSummaryJson`의 공개 schema는
`media-server.ops.v390-onvif-credential-provider-status.v1`, status는
`sanitizedCredentialProviderStatusSummary`입니다. `/ops/sources`의
`renderOnvifCredentialProviderStatus`가 이 요약을 표시합니다.

- `providerReadiness.primaryProvider=none`, `primaryProviderReady=false`.
- `fallbackProvider=in-memory-fixture`, `fallbackProviderReady=true`는 fixture 경로의 준비 상태 설명입니다.
  운영 credential이 등록됐거나 장비 인증에 성공했다는 뜻이 아닙니다.
- `statusSummaryOnly=true`, `credentialLookupPerformed=false`이며 실제 reference 값·secret material을 반환하지 않습니다.
- `productPersistentSecretStoreEnabled=false`, `externalSecretManagerEnabled=false`와
  `referenceValueExposed=false`, `credentialMaterialExposed=false`를 유지합니다.
- `generatedAt`은 요약 생성 시각이며 마지막 장비 probe 시각이 아닙니다.

이 API가 존재하므로 “provider status 공개는 모두 미래 기능”이라고 설명하지 않습니다.
반대로 내부 `CredentialLookupResult`를 기존 probe/draft 응답에 추가하려면 별도 schema version·호환성 검토와
redaction/failure wording 검증이 필요합니다. 준비 상태 요약이 그 변경을 승인하지 않습니다.

### Draft credential gate

draft의 `credentialGate`는 `media-server.onvif-credential-binding-gate.v1`입니다.
`credentialRefPresent`는 boolean, `credentialReferenceStatus`는 `reference-present-redacted`/`reference-absent`로
존재 여부만 표현하고 실제 reference는 반환하지 않습니다. `sourceWriteRequired=true`,
`requiredScope=source:write`와 영속 저장소·binding store 비활성 경계를 유지합니다.
현재 provider 선택·제외 이유와 [정책 결정 fixture](../test/fixtures/onvif_credential_store_policy_decision.json)는
[저장소 연동 설계](./onvif-credential-store-integration-design.md)에 모았습니다.

## 검증 정의

아래 명령은 실행 방법이며 현재 실행 PASS가 아닙니다.

| 명령 | 범위 |
| --- | --- |
| `./server.sh verify-v260-onvif-credential-gate` | gate schema·선택·guard·UI 비노출 정적 검사 |
| `./server.sh verify-v390-onvif-credential-provider-status` | 읽기 전용 provider status의 소스·정의 검사 |
| `./server.sh verify-onvif-auth-injection-design` | method fixture·주입 구현·설계 연결 정적 검사 |
| `./server.sh verify-onvif-probe-fixture-contract` | 합성 fixture와 미저장/redaction 계약 검사 |
| `./server.sh verify-onvif-field-smoke-redaction` | 공유 산출물 redaction 기준 검사 |
| `./server.sh verify-onvif-credential-reference-policy` | 문서·source·fixture 검사와 C++ provider smoke 빌드/실행 |
| `./server.sh verify-onvif-probe-error-wording` | C++ 실패 요약·민감값 비노출 fixture 검사 |
| `./server.sh verify-onvif-auth-injection-loopback` | C++ None/Basic provider의 loopback 요청·실패 요약 검사 |
| `./server.sh verify-onvif-probe-draft-api` | 별도 격리 서버의 draft 응답·400 오류·SourceRegistry readback 검사 |
| `git diff --check` | 문서 변경의 공백 오류 검사 |

실행 환경·소유 임시 경로·cleanup은 [무장비 검증](./onvif-no-device-verification.md),
승인·기록·실제 UI와 장시간 검증 경계는 [검증 정책](./stream-verification.md#검증-정책)을 따릅니다.
실장비 credential 성공, 영속 저장소, rotation/expiry/audit workflow는 이 정적 문서나 fixture로 완료 판정하지 않습니다.

## 구현 위치

- [provider interface](../include/ingress/onvif_credential_provider.h)와
  [구현](../src/ingress/onvif_credential_provider.cpp): `CredentialSecretProvider`, `NoneCredentialSecretProvider`, `InMemoryCredentialSecretProvider`.
- [live import](../src/ingress/onvif_live_import.cpp): `RunOnvifProbeAdapter`, `BuildOnvifLiveImportDraft`, `OnvifCredentialGateJson`.
- [HTTP route](../src/ingress/webrtc_http_server_runtime.cpp),
  [상태 요약](../src/ingress/webrtc_http_server_ops_foundation.cpp),
  [Ops UI](../src/ingress/product_ui_ops_sources_script.cpp): 권한 guard와 읽기 전용 상태 표시.
